// Free photos from Unsplash (Unsplash License: free to use, no permission needed).
// Served from Unsplash's image CDN at the size each spot needs.
const base = (id: string) => (w: number, h?: number) => `https://images.unsplash.com/${id}?w=${w}${h ? `&h=${h}&fit=crop` : ''}&q=75&auto=format`;

export const PHOTOS = {
  dosaThali: base('photo-1668236543090-82eba5ee5976'), // dosa with katoris of chutney
  dosaLeaf: base('photo-1694849789325-914b71ab4075'), // dosa on banana leaf
  restaurant: base('photo-1729394405518-eaf2a0203aa7'), // warm restaurant interior
  phonePay: base('photo-1705948482595-606e2848c65b'), // paying by phone at the counter
  idli: base('photo-1788621879512-0aefb7a774ff'), // idli with sambar
  idliRound: base('photo-1632104667384-06f58cb7ad44'),
  chai: base('photo-1761483281417-778013dc0177'),
  vada: base('photo-1730191843435-073792ba22bc'),
  paneer: base('photo-1631452180519-c014fe946bc7'),
  kulfi: base('photo-1701261919026-d6ce6cb9be0f'),
  naan: base('photo-1697155406014-04dc649b0953'),
};

// Dishes shown in the sliding food row on the home page.
const u = (id: string) => `https://images.unsplash.com/${id}`;
export const MENU_SHOWCASE = [
  { name: 'Masala Dosa', mr: 'मसाला डोसा', price: 180, image: u('photo-1668236543090-82eba5ee5976') },
  { name: 'Idli Sambar', mr: 'इडली सांबार', price: 120, image: u('photo-1632104667384-06f58cb7ad44') },
  { name: 'Medu Vada', mr: 'मेदू वडा', price: 110, image: u('photo-1730191843435-073792ba22bc') },
  { name: 'Paneer Tikka', mr: 'पनीर टिक्का', price: 399, image: u('photo-1567188040759-fb8a883dc6d8') },
  { name: 'Paneer Butter Masala', mr: 'पनीर बटर मसाला', price: 329, image: u('photo-1631452180519-c014fe946bc7') },
  { name: 'Dal Tadka', mr: 'दाल तडका', price: 229, image: u('photo-1755090154817-58d9d36ec988') },
  { name: 'Butter Naan', mr: 'बटर नान', price: 60, image: u('photo-1697155406014-04dc649b0953') },
  { name: 'Jeera Rice', mr: 'जीरा राईस', price: 179, image: u('photo-1789991184293-224a84e41900') },
  { name: 'Masala Chai', mr: 'मसाला चहा', price: 40, image: u('photo-1761483281417-778013dc0177') },
  { name: 'Filter Coffee', mr: 'फिल्टर कॉफी', price: 63, image: u('photo-1757918391899-1341f7b285fb') },
  { name: 'Kulfi', mr: 'कुल्फी', price: 119, image: u('photo-1701261919026-d6ce6cb9be0f') },
];
