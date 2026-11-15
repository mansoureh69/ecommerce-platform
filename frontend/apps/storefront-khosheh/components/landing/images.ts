const photo = (id: string, width: number) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;

export const heroImages = [photo("photo-1526047932273-341f2a7631f9", 1800), photo("photo-1563241527-3004b7be0ffd", 1800)];
export const craftImage = photo("photo-1469259943454-aa100abba749", 1200);
export const occasionImages = [
  photo("photo-1487070183336-b863922373d4", 900),
  photo("photo-1490750967868-88aa4486c946", 900),
  photo("photo-1519225421980-715cb0215aed", 900),
  photo("photo-1469259943454-aa100abba749", 900),
];
export const galleryImages = [
  photo("photo-1561181286-d3fee7d55364", 700),
  photo("photo-1526047932273-341f2a7631f9", 700),
  photo("photo-1494972308805-463bc619d34e", 700),
  photo("photo-1496062031456-07b8f162a322", 700),
];
