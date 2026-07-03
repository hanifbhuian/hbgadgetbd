# HB Gadget BD Product Updates

Regular product changes should be made in this file:

assets/data/products.json

Product images should be added in this folder:

assets/uploads/

The website now loads product data from the GitHub raw product file at runtime. This means product changes can appear without a full production deploy after the updated JavaScript is live on the site.

Daily workflow:

1. Edit assets/data/products.json.
2. Add, remove, or revise product entries.
3. Add product images to assets/uploads when needed.
4. Commit the changes to GitHub.
5. Refresh the live website after a few minutes.

A full hosting deploy is still needed for code, design, layout, CSS, logo, cart, homepage, and admin configuration changes.
