const config = {
  JSON_URL:
    "https://mobil.trk.de/geoserver/TBA/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=TBA%3Afahrradanlagen&outputFormat=application%2Fjson",
  HTTPS_TIMEOUT: 10000, // 10 seconds
  REVALIDATE_TIME: 3600, // 1 hour in seconds
};

export default config;
