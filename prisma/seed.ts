import {
  PrismaClient,
  PropertyStatus,
  TransactionType,
  RequestStatus,
  MeetingStatus,
  Role,
  User,
  Property,
  TransactionRequest,
  ListingType,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

/** Approximate coordinates for Syrian cities (for map display) */
const SYRIA_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Damascus: { lat: 33.5138, lng: 36.2765 },
  Aleppo: { lat: 36.2021, lng: 37.1343 },
  Latakia: { lat: 35.5312, lng: 35.7822 },
  Homs: { lat: 34.7324, lng: 36.7137 },
  Tartus: { lat: 34.8956, lng: 35.8867 },
};

async function main() {
  console.log("🌱 Starting database seeding...\n");

  // Clear existing data (optional - comment out if you want to keep existing data)
  await prisma.meeting.deleteMany();
  await prisma.transactionRequest.deleteMany();
  await prisma.propertyImage.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Admin User
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  let admin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!admin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        firstName: "Admin",
        lastName: "User",
        phone: "0000000000",
        role: Role.ADMIN,
      },
    });
    console.log("✅ Admin user created:", admin.email, "(password: admin123)");
  } else {
    console.log("ℹ️  Admin user already exists:", admin.email);
  }

  // 2. Create Regular Users
  const usersData = [
    {
      email: "john.doe@example.com",
      password: "password123",
      firstName: "John",
      lastName: "Doe",
      phone: "1234567890",
    },
    {
      email: "jane.smith@example.com",
      password: "password123",
      firstName: "Jane",
      lastName: "Smith",
      phone: "0987654321",
    },
    {
      email: "bob.wilson@example.com",
      password: "password123",
      firstName: "Bob",
      lastName: "Wilson",
      phone: "5555555555",
    },
  ];

  const users: User[] = [];
  for (const userData of usersData) {
    let user = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (!user) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      user = await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
          role: Role.USER,
        },
      });
      console.log("✅ User created:", user.email, "(password: password123)");
    } else {
      console.log("ℹ️  User already exists:", user.email);
    }
    users.push(user);
  }

  // 3. Create Properties
  const propertiesData = [
    {
      title: "Modern Apartment in Downtown",
      type: "APARTMENT",
      listingType: ListingType.SALE,
      address: "123 Main Street, New York, NY 10001",
      description:
        "Beautiful 2-bedroom apartment with city view. Recently renovated with modern amenities.",
      price: 250000,
      salePrice: 250000,
      location: "123 Main Street, New York, NY 10001",
      latitude: 40.7128,
      longitude: -74.006,
      area: 85.5,
      rooms: 2,
      floor: 5,
      status: PropertyStatus.ACTIVE,
      ownerId: users[0].id, // John Doe
    },
    {
      title: "Luxury House with Garden",
      type: "HOUSE",
      listingType: ListingType.BOTH,
      address: "456 Oak Avenue, Brooklyn, NY 11201",
      description:
        "Spacious 4-bedroom house with large garden. Perfect for families. Close to schools and parks.",
      price: 550000,
      salePrice: 550000,
      rentPrice: 2500,
      location: "456 Oak Avenue, Brooklyn, NY 11201",
      latitude: 40.6782,
      longitude: -73.9442,
      area: 180.0,
      rooms: 4,
      floor: 1,
      status: PropertyStatus.ACTIVE,
      ownerId: users[1].id, // Jane Smith
    },
    {
      title: "Cozy Studio Apartment",
      type: "APARTMENT",
      listingType: ListingType.SALE,
      address: "789 Pine Street, Queens, NY 11101",
      description:
        "Affordable studio apartment in quiet neighborhood. Great for first-time buyers.",
      price: 150000,
      salePrice: 150000,
      location: "789 Pine Street, Queens, NY 11101",
      latitude: 40.7282,
      longitude: -73.7949,
      area: 45.0,
      rooms: 1,
      floor: 3,
      status: PropertyStatus.ACTIVE,
      ownerId: users[0].id, // John Doe
    },
    {
      title: "Penthouse with Rooftop Terrace",
      type: "APARTMENT",
      listingType: ListingType.SALE,
      address: "321 Park Avenue, Manhattan, NY 10022",
      description:
        "Luxurious penthouse with stunning city views. Includes private rooftop terrace.",
      price: 1200000,
      salePrice: 1200000,
      location: "321 Park Avenue, Manhattan, NY 10022",
      latitude: 40.7589,
      longitude: -73.9851,
      area: 200.0,
      rooms: 3,
      floor: 20,
      status: PropertyStatus.RESERVED,
      ownerId: users[1].id, // Jane Smith
    },
    {
      title: "Family Home in Suburbs",
      type: "HOUSE",
      listingType: ListingType.RENT,
      address: "654 Elm Drive, Staten Island, NY 10301",
      description:
        "Large family home with backyard. Great neighborhood with excellent schools nearby.",
      price: 0,
      rentPrice: 3000,
      location: "654 Elm Drive, Staten Island, NY 10301",
      latitude: 40.5795,
      longitude: -74.1502,
      area: 220.0,
      rooms: 5,
      floor: 1,
      status: PropertyStatus.ACTIVE,
      ownerId: users[2].id, // Bob Wilson
    },
  ];

  const properties: Property[] = [];
  for (const propData of propertiesData) {
    const property = await prisma.property.create({
      data: propData,
    });
    properties.push(property);
    console.log("✅ Property created:", property.title, `(${property.status})`);
  }

  // 3b. Seed Syrian properties from data/syria_prices.csv
  const csvPath = path.join(process.cwd(), "data", "syria_prices.csv");
  if (fs.existsSync(csvPath)) {
    const content = fs.readFileSync(csvPath, "utf-8");
    const lines = content
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#"));
    const header = lines[0];
    if (header.startsWith("city,")) {
      let syrianCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");
        if (cols.length < 10) continue;
        const city = cols[0]?.trim();
        const type = (cols[1]?.trim() || "APARTMENT") as string;
        const neighborhood = cols[2]?.trim() || city;
        const area_sqm = parseFloat(cols[3]) || 100;
        const rooms = parseInt(cols[4], 10) || 2;
        const floor = parseInt(cols[5], 10) || 0;
        const price_min = parseFloat(cols[6]) || 0;
        const price_max = parseFloat(cols[7]) || 0;
        const price_per_sqm = parseFloat(cols[8]) || 500;
        const condition = cols[9]?.trim() || "good";
        const notes = cols.slice(12).join(",").trim() || "";
        const price =
          price_min && price_max
            ? Math.round((price_min + price_max) / 2)
            : Math.round(area_sqm * price_per_sqm);
        const coords = SYRIA_CITY_COORDS[city] || SYRIA_CITY_COORDS.Damascus;
        const title = `${type === "HOUSE" ? "منزل" : "شقة"} في ${neighborhood}, ${city}`;
        const location = `${neighborhood}, ${city}, Syria`;
        const description = notes
          ? `${condition} condition. ${notes}`
          : `${condition} property in ${neighborhood}, ${city}.`;
        const ownerId = users[syrianCount % users.length].id;

        // Randomly assign listing type for variety
        let listingType: ListingType = ListingType.SALE;
        const rand = Math.random();
        if (rand > 0.8) listingType = ListingType.BOTH;
        else if (rand > 0.6) listingType = ListingType.RENT;

        const salePrice = listingType !== ListingType.RENT ? price : null;
        const rentPrice =
          listingType !== ListingType.SALE ? Math.round(price * 0.005) : null;

        const property = await prisma.property.create({
          data: {
            title,
            type,
            listingType,
            address: location,
            description,
            price: salePrice || 0,
            salePrice,
            rentPrice,
            location,
            latitude: coords.lat,
            longitude: coords.lng,
            area: area_sqm,
            rooms,
            floor: floor || undefined,
            status: PropertyStatus.ACTIVE,
            ownerId,
          },
        });
        properties.push(property);
        syrianCount++;
      }
      console.log(
        `✅ Created ${syrianCount} Syrian properties from syria_prices.csv`,
      );
    }
  } else {
    console.log(
      "ℹ️  data/syria_prices.csv not found, skipping Syrian properties",
    );
  }

  // 4. Create Property Images (sample file names - actual files should be uploaded)
  const propertyImages = [
    { propertyId: properties[0].id, fileName: "apartment1-main.jpg" },
    { propertyId: properties[0].id, fileName: "apartment1-kitchen.jpg" },
    { propertyId: properties[1].id, fileName: "house1-exterior.jpg" },
    { propertyId: properties[1].id, fileName: "house1-garden.jpg" },
    { propertyId: properties[2].id, fileName: "studio1-main.jpg" },
    { propertyId: properties[3].id, fileName: "penthouse1-main.jpg" },
    { propertyId: properties[4].id, fileName: "family-home1-exterior.jpg" },
  ];

  for (const imageData of propertyImages) {
    await prisma.propertyImage.create({
      data: imageData,
    });
  }
  console.log(`✅ Created ${propertyImages.length} property images`);

  // 5. Create Transaction Requests
  const requestsData = [
    {
      propertyId: properties[0].id, // Modern Apartment
      requesterId: users[1].id, // Jane Smith requests John's apartment
      type: TransactionType.BUY,
      status: RequestStatus.PENDING,
    },
    {
      propertyId: properties[1].id, // Luxury House
      requesterId: users[2].id, // Bob Wilson requests Jane's house
      type: TransactionType.RENT,
      status: RequestStatus.PENDING,
    },
    {
      propertyId: properties[2].id, // Cozy Studio
      requesterId: users[1].id, // Jane Smith requests John's studio
      type: TransactionType.BUY,
      status: RequestStatus.APPROVED,
      decisionAt: new Date(),
    },
    {
      propertyId: properties[4].id, // Family Home
      requesterId: users[0].id, // John Doe requests Bob's house
      type: TransactionType.BUY,
      status: RequestStatus.REJECTED,
      decisionAt: new Date(),
    },
  ];

  const requests: TransactionRequest[] = [];
  for (const requestData of requestsData) {
    const request = await prisma.transactionRequest.create({
      data: requestData,
    });
    requests.push(request);
    console.log(
      `✅ Request created: ${request.type} request for property ${request.propertyId} (${request.status})`,
    );
  }

  // 6. Create Meeting (for approved request)
  const approvedRequest = requests.find(
    (r) => r.status === RequestStatus.APPROVED,
  );
  if (approvedRequest) {
    const property = properties.find(
      (p) => p.id === approvedRequest.propertyId,
    );
    if (property) {
      const meeting = await prisma.meeting.create({
        data: {
          propertyId: property.id,
          transactionRequestId: approvedRequest.id,
          buyerId: approvedRequest.requesterId,
          sellerId: property.ownerId,
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          latitude: 40.7128,
          longitude: -74.006,
          status: MeetingStatus.SCHEDULED,
        },
      });
      console.log("✅ Meeting created for approved request:", meeting.id);
    }
  }

  console.log("\n✨ Seeding completed successfully!");
  console.log("\n📋 Summary:");
  console.log(`   - 1 Admin user (${adminEmail} / admin123)`);
  console.log(
    `   - ${users.length} Regular users (all passwords: password123)`,
  );
  console.log(
    `   - ${properties.length} Properties (${properties.filter((p) => p.status === PropertyStatus.ACTIVE).length} ACTIVE, ${properties.filter((p) => p.status === PropertyStatus.RESERVED).length} RESERVED)`,
  );
  console.log(`   - ${propertyImages.length} Property images`);
  console.log(`   - ${requests.length} Transaction requests`);
  console.log(`   - ${approvedRequest ? "1 Meeting" : "0 Meetings"}`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
