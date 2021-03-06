// 'use strict'; // Use the function form of "use strict".
// initialize global variables
// JSHint warning remedy globals
/*global ko*/
/*global google */
/*global $ */
var map;
var infoWindow;
// Create a new blank array for all the listing markers.
var markers = [];

// foursquare global variables
var fs_client_id = "MAOBK3T1HOKV2AE2KE5DAQHGHQL0TPDJBI43LR4USA2O1SW1"; // change
var fs_client_secret = "JIW3A5XOYAIHNFPWIQXEP0B2OS45XCWUBJNO3XSTT2K5XJG3"; // change

// Initial place listings that will be shown to the user.
var locations = [
    { title: 'Arlington Club', location: { lat: 40.771535, lng: -73.961690 } },
    { title: 'Made Man Barbershop', location: { lat: 40.743624, lng: -73.995399 } },
    { title: 'Union Square Loft', location: { lat: 40.738142, lng: -73.990412 } },
    { title: 'Stanton Street Yoga', location: { lat: 40.719956, lng: -73.982998 } },
    { title: 'Tribeca Grill', location: { lat: 40.719543, lng: -74.010056 } },
    { title: 'Hong Kong Supermarket', location: { lat: 40.717656, lng: -73.995973 } }
];

// apply knockout bindings
function initialize() {
    'use strict';
    ko.applyBindings(new ViewModel());
}

function mapfailure() {
    alert("Google Maps has failed. Please refresh the page.");
}

function setMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 40.7413549, lng: -73.9980244 }, // initialize map center
        zoom: 13,
    });
}

// initialize map and list
function ViewModel() {
    var self = this;
    this.input = ko.observable("");
    this.placesList = ko.observableArray([]);

    // setup google map
    setMap();

    // create location instances
    locations.forEach(function(place) {
        self.placesList.push(new PlaceModel(place));
    });

    // input box filter
    this.filteredList = ko.computed(function() {
        var data = self.input().toUpperCase();
        if (!data || data == 'undefined') {
            self.placesList().forEach(function(place) {
                place.show(true);
            });
            return self.placesList();
        } else {
            return ko.utils.arrayFilter(self.placesList(), function(place) {
                var location = place.title.toUpperCase();
                var list = (location.search(data) >= 0);
                place.show(list);
                return list;
            });
        }
    }, self);

}

var PlaceModel = function(data) {
    var self = this;
    this.title = data.title;
    this.position = data.location;
    this.image = "";
    this.address = "";
    this.likes = "";
    this.website_url = "";

    var place = {
        map: map,
        position: self.position,
        title: self.title,
        animation: google.maps.Animation.DROP
    };
    // create a marker
    self.marker = new google.maps.Marker(place);
    // push marker to markers array
    markers.push(self.marker);

    // triggers the visibility of marker in the map
    self.show = ko.observable(true);
    self.showMarker = ko.computed(function() {
        if (self.show()) {
            self.marker.setMap(map);
        } else {
            self.marker.setMap(null);
        }
        return true;
    }, this);

    // create infoWindow
    infoWindow = new google.maps.InfoWindow();

    // setup foursquare API endpoint
    var fs_url = 'https://api.foursquare.com/v2/venues/search?ll=' + self.position.lat +
        ',' + self.position.lng + '&query=' + self.title + '&client_id=' + fs_client_id +
        '&client_secret=' + fs_client_secret + '&v=20160118';

    $.getJSON(fs_url, function(data) {
        var place = data.response.venues[0];
        var id = place.id;
        var address = "";
        $.each(place.location.formattedAddress, function(key, value) {
            if (value) {
                address += value + " ";
            }
        });


        // setup place endpoint acquiring photo and likes count
        var fs_place_info = 'https://api.foursquare.com/v2/venues/' + id + '?client_id=' +
            fs_client_id + '&client_secret=' + fs_client_secret + '&v=20160118';
        $.getJSON(fs_place_info, function(data) {
            var place_info = data.response.venue;
            var pic;
            if (place_info.bestPhoto) {
                pic = place_info.bestPhoto;
                self.image = pic.prefix + "150x150" + pic.suffix;
            } else {
                // default image when foursquare cannot provide a picture.
                pic = "https://1.bp.blogspot.com/-lKV5NwicXhE/UQN5E6kgxoI/AAAAAAAAAOs" +
                    "/zJluoYOdhJw/s150/NO-IMAGE-AVAILABLE-ICON-web.jpg";
                self.image = pic;
            }
            if (place_info.likes.count) {
                self.likes = place_info.likes.count;
            } else {
                self.likes = "N/A";
            }

        }).fail(function() {
            alert("foursquare API request failed!");
        });

        self.address = address;
        if (place.url) {
            self.website_url = place.url;
        } else {
            self.website_url = 'https://foursquare.com/v/' + id; // fallbacks to a foursquare page of the place
        }

    }).fail(function() {
        alert("Foursquare API call has an error. Please refresh the page.");
    });

    // shows Infowindow and center marker on the map
    function showInfoWindow(marker) {
        map.setCenter(marker.getPosition());
        populateInfoWindow(marker, infoWindow);
    }

    // create event when marker is clicked
    self.marker.addListener('click', function() {
        showInfoWindow(self.marker);
    });

    // create event when item is clicked on the list.
    self.listItemClicked = function(place) {
        showInfoWindow(self.marker);
    };

    // create Infowindows for each marker
    function populateInfoWindow(marker, infowindow) {
        // Check to make sure the infowindow is not already opened on this marker.
        if (infowindow.marker != marker) {
            infowindow.close();
            infowindow.marker = marker;

            infowindow.setContent(
                '<div class="info-window-content"><a href="' + self.website_url +
                '"><div class="infoWindow"><h2><b>' + marker.title + '</b></h2></div>' +
                '<div class="infowindow"><img "alt="place photo" src="' + self.image + '"></a></div>' +
                '<div class="infowindow"><b>' + self.address + "</b></div>" +
                '<div class="infowindow"><b>Likes:</b><em> ' + self.likes + "</em></div>");
            infowindow.open(map, marker);
            // Make sure the marker property is cleared if the infowindow is closed.
            infowindow.addListener('closeclick', function() {
                infowindow.marker = null;
            });
            // Bounce animation when marker is clicked
            marker.setAnimation(google.maps.Animation.BOUNCE);
            // set Duration of animation
            setTimeout(function() {
                marker.setAnimation(null);
            }, 1200);
        }
    }
};