/**
 * 🌱 AMBLE DATABASE SEED SCRIPT
 * ================================
 * Đặt file này thẳng trong thư mục BE/
 * Chạy: node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');
const Partner = require('./models/partner');
const Restaurant = require('./models/restaurant');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/amble_db';

// ─── Users (customers) ────────────────────────────────────────────────────────
const usersData = [
  {
    fullName: 'Nguyen Thi Lan',
    email: 'lan.nguyen@gmail.com',
    password: 'password123',
    phone: '0901234567',
    bio: 'Mê khám phá ẩm thực và những quán ăn mới 🍜',
    location: 'Ho Chi Minh City',
    role: 'customer',
  },
  {
    fullName: 'Tran Van Minh',
    email: 'minh.tran@gmail.com',
    password: 'password123',
    phone: '0912345678',
    bio: 'Foodie chính hiệu, thích chụp ảnh đồ ăn 📸',
    location: 'District 3, HCMC',
    role: 'customer',
  },
  {
    fullName: 'Pham Thi Hoa',
    email: 'hoa.pham@gmail.com',
    password: 'password123',
    phone: '0923456789',
    bio: 'Brunch lover ☕ Cuối tuần là phải đi ăn ngon!',
    location: 'Binh Thanh, HCMC',
    role: 'customer',
  },
  {
    fullName: 'Admin Amble',
    email: 'admin@amble.com',
    password: 'admin123456',
    phone: '0900000001',
    bio: 'Amble platform administrator.',
    location: 'Ho Chi Minh City',
    role: 'admin',
  },
];

// ─── Partners & Restaurants ───────────────────────────────────────────────────
const partnersData = [
  {
    partner: {
      ownerName: 'Nguyễn Văn Hùng',
      email: 'partner@rooftop.vn',
      password: 'demo123',
      phone: '028 1234 5678',
      restaurantName: 'The Rooftop Saigon',
      restaurantAddress: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1',
      restaurantCity: 'Hồ Chí Minh',
      cuisine: 'Âu – Việt Fusion',
      subscriptionPackage: 'premium',
      subscriptionStatus: 'active',
      role: 'owner',
    },
    restaurant: {
      name: 'The Rooftop Saigon',
      cuisine: 'Âu – Việt Fusion',
      location: 'Quận 1, TP.HCM',
      city: 'Hồ Chí Minh',
      address: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1',
      phone: '028 1234 5678',
      description: 'Nhà hàng fusion trên sân thượng cao nhất Quận 1, view toàn cảnh TP.HCM. Không gian lãng mạn, menu kết hợp tinh tế giữa ẩm thực Pháp và Việt Nam.',
      openTime: '11:00',
      closeTime: '23:00',
      openDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      priceMin: 350000,
      priceMax: 1200000,
      priceRange: '$$$',
      images: [
        'https://images.unsplash.com/photo-1740030325913-75f698b7bfb9?w=800',
        'https://images.unsplash.com/photo-1762015669851-4098e655ec87?w=800',
      ],
      tags: ['Rooftop', 'Romantic', 'City View', 'Fusion'],
      categories: ['date', 'business', 'celebration'],
      hasParking: true,
      rating: 4.8,
      reviewCount: 328,
      isFeatured: true,
      subscriptionPackage: 'premium',
      lat: 10.7769,
      lng: 106.7009,
      facebook: 'facebook.com/theRooftopSaigon',
      instagram: 'instagram.com/rooftopsaigon',
      tiktok: 'tiktok.com/@rooftopsaigon',
    },
  },
  {
    partner: {
      ownerName: 'Tanaka Yuki',
      email: 'owner@sakuragarden.vn',
      password: 'sakura123',
      phone: '028 9876 5432',
      restaurantName: 'Sakura Garden',
      restaurantAddress: '45 Nam Kỳ Khởi Nghĩa, Quận 3',
      restaurantCity: 'Hồ Chí Minh',
      cuisine: 'Nhật Bản',
      subscriptionPackage: 'pro',
      subscriptionStatus: 'active',
      role: 'owner',
    },
    restaurant: {
      name: 'Sakura Garden',
      cuisine: 'Nhật Bản',
      location: 'Quận 3, TP.HCM',
      city: 'Hồ Chí Minh',
      address: '45 Nam Kỳ Khởi Nghĩa, Quận 3',
      phone: '028 9876 5432',
      description: 'Nhà hàng Nhật Bản chính thống với không gian yên tĩnh, thực đơn phong phú từ sashimi tươi đến wagyu beef cao cấp.',
      openTime: '11:30',
      closeTime: '22:30',
      openDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
      priceMin: 300000,
      priceMax: 800000,
      priceRange: '$$$',
      images: [
        'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800',
        'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=800',
      ],
      tags: ['Japanese', 'Authentic', 'Quiet', 'Sushi'],
      categories: ['date', 'family', 'quiet'],
      hasParking: true,
      rating: 4.7,
      reviewCount: 215,
      isFeatured: true,
      subscriptionPackage: 'pro',
      lat: 10.7831,
      lng: 106.6968,
      instagram: 'instagram.com/sakuragarden.vn',
    },
  },
  {
    partner: {
      ownerName: 'Trần Thị Mai',
      email: 'owner@phobohol.vn',
      password: 'phobo123',
      phone: '024 3825 1234',
      restaurantName: 'Phở Bờ Hồ',
      restaurantAddress: '36 Đinh Tiên Hoàng, Hoàn Kiếm',
      restaurantCity: 'Hà Nội',
      cuisine: 'Việt Nam Truyền Thống',
      subscriptionPackage: 'basic',
      subscriptionStatus: 'active',
      role: 'owner',
    },
    restaurant: {
      name: 'Phở Bờ Hồ',
      cuisine: 'Việt Nam Truyền Thống',
      location: 'Hoàn Kiếm, Hà Nội',
      city: 'Hà Nội',
      address: '36 Đinh Tiên Hoàng, Hoàn Kiếm',
      phone: '024 3825 1234',
      description: 'Quán phở truyền thống nổi tiếng với 50 năm lịch sử bên Hồ Hoàn Kiếm. Nước dùng ninh 24 giờ, thịt bò tươi nhập hàng ngày.',
      openTime: '06:00',
      closeTime: '22:00',
      openDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      priceMin: 50000,
      priceMax: 200000,
      priceRange: '$',
      images: [
        'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800',
        'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800',
      ],
      tags: ['Traditional', 'Local', 'Budget-friendly', 'Authentic'],
      categories: ['family', 'local', 'budget'],
      hasParking: false,
      rating: 4.5,
      reviewCount: 541,
      isFeatured: false,
      subscriptionPackage: 'basic',
      lat: 21.0285,
      lng: 105.8542,
      facebook: 'facebook.com/phobohol',
    },
  },
  {
    partner: {
      ownerName: 'Lê Quốc Bảo',
      email: 'owner@bistrosaigon.vn',
      password: 'bistro123',
      phone: '028 3535 5678',
      restaurantName: 'Bistro Saigon',
      restaurantAddress: '78 Phan Xích Long, Bình Thạnh',
      restaurantCity: 'Hồ Chí Minh',
      cuisine: 'Bistro – Pháp',
      subscriptionPackage: 'pro',
      subscriptionStatus: 'active',
      role: 'owner',
    },
    restaurant: {
      name: 'Bistro Saigon',
      cuisine: 'Bistro – Pháp',
      location: 'Bình Thạnh, TP.HCM',
      city: 'Hồ Chí Minh',
      address: '78 Phan Xích Long, Bình Thạnh',
      phone: '028 3535 5678',
      description: 'Không gian bistro châu Âu ấm áp, thực đơn đa dạng từ crepe đến steak. Góc chill lý tưởng giữa lòng Sài Gòn.',
      openTime: '09:00',
      closeTime: '23:00',
      openDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      priceMin: 150000,
      priceMax: 600000,
      priceRange: '$$',
      images: [
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
        'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800',
      ],
      tags: ['Bistro', 'French', 'Chill', 'Brunch'],
      categories: ['date', 'chill', 'brunch'],
      hasParking: false,
      rating: 4.6,
      reviewCount: 189,
      isFeatured: true,
      subscriptionPackage: 'pro',
      lat: 10.8031,
      lng: 106.7139,
      instagram: 'instagram.com/bistrosaigon',
      tiktok: 'tiktok.com/@bistrosaigon',
    },
  },
  {
    partner: {
      ownerName: 'Kim Jae-won',
      email: 'owner@kbbqkingdom.vn',
      password: 'kbbq123',
      phone: '028 5412 7890',
      restaurantName: 'K-BBQ Kingdom',
      restaurantAddress: '15 Nguyễn Thị Thập, Quận 7',
      restaurantCity: 'Hồ Chí Minh',
      cuisine: 'Nướng Hàn Quốc',
      subscriptionPackage: 'premium',
      subscriptionStatus: 'active',
      role: 'owner',
    },
    restaurant: {
      name: 'K-BBQ Kingdom',
      cuisine: 'Nướng Hàn Quốc',
      location: 'Quận 7, TP.HCM',
      city: 'Hồ Chí Minh',
      address: '15 Nguyễn Thị Thập, Quận 7',
      phone: '028 5412 7890',
      description: 'Thiên đường BBQ Hàn Quốc với bếp nướng than hoa ngay tại bàn. Thịt nhập khẩu trực tiếp từ Hàn, hơn 30 loại thịt và hải sản.',
      openTime: '11:00',
      closeTime: '23:30',
      openDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      priceMin: 200000,
      priceMax: 700000,
      priceRange: '$$',
      images: [
        'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
        'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800',
      ],
      tags: ['Korean', 'BBQ', 'Group', 'Fun'],
      categories: ['group', 'family', 'fun'],
      hasParking: true,
      rating: 4.4,
      reviewCount: 302,
      isFeatured: true,
      subscriptionPackage: 'premium',
      lat: 10.7301,
      lng: 106.7181,
      facebook: 'facebook.com/kbbqkingdom',
      tiktok: 'tiktok.com/@kbbqkingdom',
    },
  },
  {
    partner: {
      ownerName: 'Nguyễn Thị Thu Hà',
      email: 'owner@gardenterrace.vn',
      password: 'garden123',
      phone: '0236 3825 999',
      restaurantName: 'Garden Terrace Da Nang',
      restaurantAddress: '200 Trường Sa, Ngũ Hành Sơn',
      restaurantCity: 'Đà Nẵng',
      cuisine: 'Hải Sản – Á Đông',
      subscriptionPackage: 'premium',
      subscriptionStatus: 'active',
      role: 'owner',
    },
    restaurant: {
      name: 'Garden Terrace Da Nang',
      cuisine: 'Hải Sản – Á Đông',
      location: 'Ngũ Hành Sơn, Đà Nẵng',
      city: 'Đà Nẵng',
      address: '200 Trường Sa, Ngũ Hành Sơn',
      phone: '0236 3825 999',
      description: 'Nhà hàng hải sản view biển tuyệt đẹp tại Đà Nẵng. Nguyên liệu tươi sống nhập hàng ngày từ ngư dân địa phương, không gian sân vườn xanh mát.',
      openTime: '10:00',
      closeTime: '22:30',
      openDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      priceMin: 400000,
      priceMax: 1500000,
      priceRange: '$$$',
      images: [
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
      ],
      tags: ['Seafood', 'Sea View', 'Garden', 'Fresh'],
      categories: ['family', 'celebration', 'date'],
      hasParking: true,
      rating: 4.9,
      reviewCount: 156,
      isFeatured: true,
      subscriptionPackage: 'premium',
      lat: 16.0397,
      lng: 108.2672,
      facebook: 'facebook.com/gardenterracedanang',
      instagram: 'instagram.com/gardenterracedanang',
    },
  },
  {
    partner: {
      ownerName: 'Võ Minh Khoa',
      email: 'owner@beplauhong.vn',
      password: 'nuong123',
      phone: '028 6688 9900',
      restaurantName: 'Bếp Lửa Hồng',
      restaurantAddress: '90 Lý Tự Trọng, Quận 1',
      restaurantCity: 'Hồ Chí Minh',
      cuisine: 'Nướng – Lẩu Việt',
      subscriptionPackage: 'pro',
      subscriptionStatus: 'active',
      role: 'owner',
    },
    restaurant: {
      name: 'Bếp Lửa Hồng',
      cuisine: 'Nướng – Lẩu Việt',
      location: 'Quận 1, TP.HCM',
      city: 'Hồ Chí Minh',
      address: '90 Lý Tự Trọng, Quận 1',
      phone: '028 6688 9900',
      description: 'Đặc sản nướng than hoa và lẩu chua cay miền Trung. Không gian ấm cúng, thân thiện, phù hợp cho bữa tối gia đình hoặc nhóm bạn.',
      openTime: '10:30',
      closeTime: '23:00',
      openDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      priceMin: 180000,
      priceMax: 650000,
      priceRange: '$$',
      images: [
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
      ],
      tags: ['BBQ', 'Hotpot', 'Vietnamese', 'Cozy'],
      categories: ['family', 'group', 'local'],
      hasParking: false,
      rating: 4.3,
      reviewCount: 412,
      isFeatured: false,
      subscriptionPackage: 'pro',
      lat: 10.7743,
      lng: 106.7014,
      facebook: 'facebook.com/beplauhong',
      tiktok: 'tiktok.com/@beplauhong',
    },
  },
  {
    partner: {
      ownerName: 'Phạm Quỳnh Anh',
      email: 'owner@cafesuaviet.vn',
      password: 'cafe123',
      phone: '024 7777 8888',
      restaurantName: 'Cà Phê Sữa Việt',
      restaurantAddress: '12 Hàng Bài, Hoàn Kiếm',
      restaurantCity: 'Hà Nội',
      cuisine: 'Cà Phê – Bánh ngọt',
      subscriptionPackage: 'basic',
      subscriptionStatus: 'active',
      role: 'owner',
    },
    restaurant: {
      name: 'Cà Phê Sữa Việt',
      cuisine: 'Cà Phê – Bánh ngọt',
      location: 'Hoàn Kiếm, Hà Nội',
      city: 'Hà Nội',
      address: '12 Hàng Bài, Hoàn Kiếm',
      phone: '024 7777 8888',
      description: 'Quán cà phê phong cách retro Hà Nội với công thức cà phê trứng độc quyền. Bánh ngọt tươi làm hàng ngày, không gian yên tĩnh để làm việc hoặc hẹn hò.',
      openTime: '07:00',
      closeTime: '22:00',
      openDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      priceMin: 40000,
      priceMax: 180000,
      priceRange: '$',
      images: [
        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
        'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800',
      ],
      tags: ['Cafe', 'Retro', 'Egg Coffee', 'Quiet'],
      categories: ['chill', 'date', 'work'],
      hasParking: false,
      rating: 4.6,
      reviewCount: 287,
      isFeatured: false,
      subscriptionPackage: 'basic',
      lat: 21.0245,
      lng: 105.8515,
      instagram: 'instagram.com/caphesuaviet',
      tiktok: 'tiktok.com/@caphesuaviet',
    },
  },
];

// ─── Main Seed Function ───────────────────────────────────────────────────────
async function seedDatabase() {
  try {
    console.log('\n🌱 Starting database seed...\n');

    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB:', MONGODB_URI);

    console.log('\n🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Partner.deleteMany({});
    await Restaurant.deleteMany({});
    console.log('   ✓ Users, Partners, Restaurants cleared');

    // Users
    console.log('\n👥 Inserting users...');
    for (const userData of usersData) {
      const user = new User(userData);
      await user.save();
      console.log(`   ✓ ${user.fullName} (${user.email}) [${user.role}]`);
    }

    // Partners & Restaurants
    console.log('\n🍽️  Inserting partners & restaurants...');
    for (const { partner: partnerData, restaurant: restaurantData } of partnersData) {
      const partner = new Partner(partnerData);
      await partner.save(); // triggers bcrypt pre-save

      const restaurant = await Restaurant.create({
        ...restaurantData,
        partnerId: partner._id,
      });

      // updateOne để tránh re-hash password
      await Partner.updateOne({ _id: partner._id }, { restaurantId: restaurant._id });

      console.log(`   ✓ ${partner.ownerName} → ${restaurant.name} [${partner.subscriptionPackage}]`);
    }
    
    // Seed tables
    await seedTables();

    console.log('\n══════════════════════════════════════════════════');
    console.log('✅ DATABASE SEEDED SUCCESSFULLY!');
    console.log('══════════════════════════════════════════════════');
    console.log('👤 Customer Accounts:');
    console.log('   lan.nguyen@gmail.com    / password123');
    console.log('   admin@amble.com         / admin123456');
    console.log('');
    console.log('🏪 Partner Accounts:');
    console.log('   partner@rooftop.vn      / demo123      (Premium)');
    console.log('   owner@sakuragarden.vn   / sakura123    (Pro)');
    console.log('   owner@phobohol.vn       / phobo123     (Basic)');
    console.log('   owner@bistrosaigon.vn   / bistro123    (Pro)');
    console.log('   owner@kbbqkingdom.vn    / kbbq123      (Premium)');
    console.log('   owner@gardenterrace.vn  / garden123    (Premium)');
    console.log('   owner@beplauhong.vn     / nuong123     (Pro)');
    console.log('   owner@cafesuaviet.vn    / cafe123      (Basic)');
    console.log('══════════════════════════════════════════════════\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedDatabase();

// ─── Seed Tables for Restaurants ──────────────────────────────────────────────
async function seedTables() {
  const Table = require('./models/table');
  
  console.log('\n🪑 Seeding tables...');
  await Table.deleteMany({});
  
  const restaurants = await Restaurant.find({}).lean();
  
  for (const restaurant of restaurants) {
    // Create 3-5 tables per restaurant
    const tableCount = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 1; i <= tableCount; i++) {
      const types = ['regular', 'view', 'vip'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      const table = await Table.create({
        restaurantId: restaurant._id,
        name: type === 'vip' ? `VIP ${String(i).padStart(2, '0')}` : 
              type === 'view' ? `View ${String(i).padStart(2, '0')}` : 
              `Bàn ${String(i).padStart(2, '0')}`,
        type,
        capacity: {
          min: 2,
          max: type === 'vip' ? 6 : type === 'view' ? 4 : 4,
        },
        description: type === 'vip' ? 'Phòng riêng tư, sang trọng' :
                     type === 'view' ? 'Bàn cạnh cửa sổ, view đẹp' :
                     'Bàn tiêu chuẩn, thoải mái',
        features: type === 'vip' ? ['Riêng tư', 'Điều hòa', 'View đẹp', 'Phục vụ riêng'] :
                  type === 'view' ? ['Cửa sổ', 'View thành phố', 'Ánh sáng tự nhiên'] :
                  ['Thoải mái', 'Gần bar'],
        images: [
          'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
          'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
        ],
        pricing: {
          baseDeposit: type === 'vip' ? 500000 : type === 'view' ? 300000 : 200000,
          peakHourMultiplier: 1.5,
        },
        isActive: true,
      });
      
      console.log(`   ✓ ${restaurant.name} → ${table.name} (${type})`);
    }
  }
  
  console.log('   ✓ Tables seeded successfully');
}
