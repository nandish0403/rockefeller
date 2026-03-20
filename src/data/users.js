const users = [
  { id: "u001", name: "Admin User", email: "admin@geoalert.com", role: "admin", avatar: "https://i.pravatar.cc/150?img=1", zoneAssigned: null, district: "All" },
  { id: "u002", name: "Eng. Sharma", email: "sharma@geoalert.com", role: "safety_officer", avatar: "https://i.pravatar.cc/150?img=2", zoneAssigned: "z001", district: "Nagpur" },
  { id: "u003", name: "Eng. Nair", email: "nair@geoalert.com", role: "safety_officer", avatar: "https://i.pravatar.cc/150?img=3", zoneAssigned: "z005", district: "Ratnagiri" },
  { id: "u004", name: "Rajan Patil", email: "rajan@geoalert.com", role: "field_worker", avatar: "https://i.pravatar.cc/150?img=4", zoneAssigned: "z001", district: "Nagpur" },
  { id: "u005", name: "Sunita Meshram", email: "sunita@geoalert.com", role: "field_worker", avatar: "https://i.pravatar.cc/150?img=5", zoneAssigned: "z003", district: "Chandrapur" }
];

const currentUser = users[0];
export { users, currentUser };
export default users;