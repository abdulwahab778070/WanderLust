mapboxgl.accessToken = mapToken;

let coordinates = [73.0479, 33.6844];

if (
  listing &&
  listing.geometry &&
  listing.geometry.coordinates &&
  listing.geometry.coordinates.length === 2
) {
  coordinates = listing.geometry.coordinates;
}

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  center: coordinates,
  zoom: 11,
});

const marker = new mapboxgl.Marker({ color: "#fe424d" })
  .setLngLat(coordinates)
  .setPopup(
    new mapboxgl.Popup({ offset: 25 }).setHTML(
      `<h5 style="font-weight:700; margin-bottom:0.2rem;">${listing.location || "Location"}</h5><p style="margin:0; font-size:0.85rem; color:#666;">Exact location provided after booking.</p>`,
    ),
  )
  .addTo(map);
