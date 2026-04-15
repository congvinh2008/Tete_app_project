data.forEach(p => {
   L.marker([p.latitude, p.longitude])
     .addTo(map)
     .bindPopup("Pangolin detected " + p.time);
});