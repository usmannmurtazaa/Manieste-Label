# MANIESTA LABEL — Firebase Architecture

Technical reference for the Firebase backend behind MANIESTA LABEL.
Last updated: 20 September 2026

---

## Project

- **Firebase Project ID:** `maniesta-label`
- **Region:** `asia-south1` (Mumbai)
- **Plan:** Spark (free tier)
- **Console:** https://console.firebase.google.com/project/maniesta-label

---

## Services in Use

| Service | Purpose | Enabled |
|---|---|---|
| Authentication | Email/password + Google sign-in | Yes |
| Cloud Firestore | Products, users, cart, wishlist, orders | Yes |
| Hosting | Site hosting (Netlify used currently) | No |
| Storage | Product image uploads | Future |
| Analytics | Page-view tracking | Yes |

---

## Firestore Collections

### `products/{productId}`

Public read, admin-only write.

```js
{
  id: "signature-drop-shoulder",
  slug: "signature-drop-shoulder",
  name: "Signature Drop Shoulder",
  collection: "Signature",
  category: "T-Shirts",
  price: 2990,
  salePrice: null,
  rating: 4.8,
  reviews: 42,
  badge: "Signature",
  inStock: true,
  sizes: ["XS","S","M","L","XL"],
  colors: [{ name: "Bone", hex: "#F7F5F1" }],
  shortDesc: "...",
  description: "...",
  specs: ["240 GSM combed cotton"],
  images: ["assets/img/..."],
  featured: false,
  bestseller: false,
  newArrival: false,
  stock: 100,
  createdAt: <timestamp>,
  updatedAt: <timestamp>
}