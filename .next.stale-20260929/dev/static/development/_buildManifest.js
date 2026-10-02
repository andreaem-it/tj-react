self.__BUILD_MANIFEST = {
  "__rewrites": {
    "afterFiles": [
      {
        "source": "/embed.json",
        "destination": "/api/iubenda-embed"
      },
      {
        "source": "/3p/gtag/js"
      },
      {
        "source": "/3p/ads/pagead/js/adsbygoogle.js"
      }
    ],
    "beforeFiles": [],
    "fallback": []
  },
  "sortedPages": [
    "/_app",
    "/_error"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()