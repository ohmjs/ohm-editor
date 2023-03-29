
export async function initNetworkReplay(page) { 
  // Avoid hitting GitHub, especially since we can get rate limited.
  await page.routeFromHAR('test/data/har/api.github.com.har', {
    url: /^https:\/\/api.github.com\//,
  });
  await page.routeFromHAR('test/data/har/unpkg.com.har', {
    url: /^https:\/\/unpkg.com\//,
  });

  // Kill requests to analytics script.
  await page.route(/^https:\/\/thirteen-six.ohmjs.org\//, route =>
    route.abort()
  );
}