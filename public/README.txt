The photo of the two of you lives here as:  us.jpg

Keep it web-sized (roughly 1200px wide, under ~1 MB). A raw phone
screenshot is ~11 MB, which is slow on mobile data and can fail to
upload during a Vercel deploy.

To re-make it from an original:
  sips -s format jpeg -s formatOptions 82 --resampleWidth 1200 SOURCE --out us.jpg
