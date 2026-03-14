// Mock data for UI preview — no Supabase dependency

export const MOCK_ROOM_ID = '42';

export const MOCK_USERS = [
  {
    id: 1,
    name: 'Sankar Kumar',
    email: 'sankar@gmail.com',
    role: 'Admin',
    room: 42,
    profile: null,
  },
  {
    id: 2,
    name: 'Priya Sharma',
    email: 'priya.sharma@gmail.com',
    role: 'Member',
    room: 42,
    profile: null,
  },
  {
    id: 3,
    name: 'Ravi Patel',
    email: 'ravi.patel@gmail.com',
    role: 'Member',
    room: 42,
    profile: null,
  },
  {
    id: 4,
    name: 'Deepa Nair',
    email: 'deepa.nair@gmail.com',
    role: 'Member',
    room: 42,
    profile: null,
  },
];

export const MOCK_EXPENSES: any[] = [
  // December 2025
  { id: 1, room: 42, material: 'Rice (5kg)', money: '450', user: 'sankar@gmail.com', created_at: '2025-12-02T10:30:00Z' },
  { id: 2, room: 42, material: 'Toor Dal (1kg)', money: '180', user: 'priya.sharma@gmail.com', created_at: '2025-12-05T14:15:00Z' },
  { id: 3, room: 42, material: 'Cooking Oil (1L)', money: '210', user: 'ravi.patel@gmail.com', created_at: '2025-12-08T09:00:00Z' },
  { id: 4, room: 42, material: 'Onions (2kg)', money: '80', user: 'sankar@gmail.com', created_at: '2025-12-12T11:45:00Z' },
  { id: 5, room: 42, material: 'Tomatoes (1kg)', money: '60', user: 'deepa.nair@gmail.com', created_at: '2025-12-15T16:20:00Z' },
  // January 2026
  { id: 6, room: 42, material: 'Atta (10kg)', money: '520', user: 'sankar@gmail.com', created_at: '2026-01-03T08:30:00Z' },
  { id: 7, room: 42, material: 'Milk (10 packets)', money: '300', user: 'priya.sharma@gmail.com', created_at: '2026-01-06T07:00:00Z' },
  { id: 8, room: 42, material: 'Eggs (30)', money: '240', user: 'ravi.patel@gmail.com', created_at: '2026-01-10T10:00:00Z' },
  { id: 9, room: 42, material: 'Sugar (2kg)', money: '90', user: 'deepa.nair@gmail.com', created_at: '2026-01-14T13:30:00Z' },
  { id: 10, room: 42, material: 'Tea Powder (500g)', money: '280', user: 'sankar@gmail.com', created_at: '2026-01-18T15:00:00Z' },
  { id: 11, room: 42, material: 'Potatoes (3kg)', money: '120', user: 'priya.sharma@gmail.com', created_at: '2026-01-22T12:00:00Z' },
  // February 2026
  { id: 12, room: 42, material: 'Paneer (500g)', money: '160', user: 'ravi.patel@gmail.com', created_at: '2026-02-01T09:30:00Z' },
  { id: 13, room: 42, material: 'Chicken (1kg)', money: '320', user: 'sankar@gmail.com', created_at: '2026-02-05T17:00:00Z' },
  { id: 14, room: 42, material: 'Curd (1kg)', money: '65', user: 'deepa.nair@gmail.com', created_at: '2026-02-08T08:15:00Z' },
  { id: 15, room: 42, material: 'Green Chillies (250g)', money: '30', user: 'priya.sharma@gmail.com', created_at: '2026-02-10T11:00:00Z' },
];

// Add Users join data for screens that expect it
const userMap = new Map(MOCK_USERS.map((u) => [u.email, u]));

export const MOCK_EXPENSES_WITH_USERS = MOCK_EXPENSES.map((e) => ({
  ...e,
  Users: userMap.get(e.user) || null,
}));

export const MOCK_BALANCE: any[] = [
  // Credits (contributions)
  { id: 1, room: 42, user: 'sankar@gmail.com', amount: '1500', status: 'credit', created_at: '2025-12-01T09:00:00Z' },
  { id: 2, room: 42, user: 'priya.sharma@gmail.com', amount: '1500', status: 'credit', created_at: '2025-12-01T09:00:00Z' },
  { id: 3, room: 42, user: 'ravi.patel@gmail.com', amount: '1500', status: 'credit', created_at: '2025-12-01T09:00:00Z' },
  { id: 4, room: 42, user: 'deepa.nair@gmail.com', amount: '1500', status: 'credit', created_at: '2025-12-01T09:00:00Z' },
  // Debits (settlements)
  { id: 5, room: 42, user: 'sankar@gmail.com', amount: '-980', status: 'debit', created_at: '2025-12-28T10:00:00Z' },
  { id: 6, room: 42, user: 'priya.sharma@gmail.com', amount: '-480', status: 'debit', created_at: '2025-12-28T10:00:00Z' },
  // January contributions
  { id: 7, room: 42, user: 'sankar@gmail.com', amount: '2000', status: 'credit', created_at: '2026-01-01T09:00:00Z' },
  { id: 8, room: 42, user: 'priya.sharma@gmail.com', amount: '2000', status: 'credit', created_at: '2026-01-01T09:00:00Z' },
  { id: 9, room: 42, user: 'ravi.patel@gmail.com', amount: '2000', status: 'credit', created_at: '2026-01-01T09:00:00Z' },
  { id: 10, room: 42, user: 'deepa.nair@gmail.com', amount: '2000', status: 'credit', created_at: '2026-01-01T09:00:00Z' },
];

export const MOCK_BALANCE_WITH_USERS = MOCK_BALANCE.map((b) => ({
  ...b,
  Users: userMap.get(b.user) || null,
}));

export const MOCK_SESSION = {
  user: {
    email: 'sankar@gmail.com',
    user_metadata: {
      full_name: 'Sankar Kumar',
    },
  },
};
