import type {
  DatabaseReader,
  DatabaseWriter,
  MutationCtx,
} from "../../_generated/server";
import { entries } from "./model";

// Mock data generators
const mockNames = [
  "The Smith Family",
  "Holiday Haven",
  "Christmas Corner",
  "Festive Friends",
  "Winter Wonderland",
  "Jingle Bell Junction",
  "Santa's Workshop",
  "North Pole Display",
  "Rudolph's Retreat",
  "Elf's Elaborate Exhibit",
  "Candy Cane Lane",
  "Frosty's Fantasy",
  "Sleigh Bell Symphony",
  "Gingerbread House",
  "Twinkle Town",
  "Holly Jolly Home",
  "Mistletoe Manor",
  "Yuletide Yard",
  "Sparkle Street",
  "Glow Garden",
];

const mockUserNames = [
  "Emma Johnson",
  "Liam Williams",
  "Olivia Brown",
  "Noah Davis",
  "Ava Miller",
  "Ethan Wilson",
  "Sophia Moore",
  "Mason Taylor",
  "Isabella Anderson",
  "William Thomas",
  "Mia Jackson",
  "James White",
  "Charlotte Harris",
  "Benjamin Martin",
  "Amelia Thompson",
  "Lucas Garcia",
  "Harper Martinez",
  "Henry Rodriguez",
  "Evelyn Lewis",
  "Alexander Lee",
];

const mockAddressesWithCoords = [
  { address: "12 Headstay Cove", lat: -33.6375446, lng: 115.38947259999999 },
  { address: "6 Moreau Grove", lat: -33.6345696, lng: 115.38846410000001 },
  {
    address: "27 Windward Green",
    lat: -33.635974499999996,
    lng: 115.39808219999999,
  },
  { address: "5 Moreau Grove", lat: -33.6346712, lng: 115.38806459999999 },
  { address: "18 Portage Way", lat: -33.6420179, lng: 115.381615 },
  { address: "29 Windward Green", lat: -33.6359604, lng: 115.39823760000002 },
  {
    address: "46 Pavillion Crescent",
    lat: -33.641224199999996,
    lng: 115.38180159999999,
  },
  { address: "433 Marine Terrace", lat: -33.6342712, lng: 115.3874676 },
  { address: "28 Keel Retreat", lat: -33.633471, lng: 115.39579289999998 },
  { address: "13 Masthead Loop", lat: -33.630693, lng: 115.39740399999998 },
  { address: "7 Mussel Court", lat: -33.6372771, lng: 115.3886794 },
  {
    address: "10 Mainsail Street",
    lat: -33.631240399999996,
    lng: 115.39737299999999,
  },
  { address: "62 Lanyard Blvd", lat: -33.6353479, lng: 115.39767519999998 },
  { address: "5 Bernier Retreat", lat: -33.6334166, lng: 115.3898761 },
  { address: "57 Keel Retreat", lat: -33.63431930000001, lng: 115.3933709 },
  { address: "16 Gunwale Elbow", lat: -33.6377105, lng: 115.3968793 },
  {
    address: "11/33 Spinnaker Blvd",
    lat: -33.630228699999996,
    lng: 115.3932084,
  },
  { address: "42 Keel Retreat", lat: -33.633691, lng: 115.3939201 },
  { address: "28 Keel Retreat", lat: -33.633471, lng: 115.39579289999998 },
  {
    address: "8 Medusa Way",
    lat: -33.638807299999996,
    lng: 115.38522979999999,
  },
  { address: "5 Twine Court", lat: -33.6355084, lng: 115.394705 },
  { address: "5 Windward Green", lat: -33.637119, lng: 115.3975216 },
  { address: "16A Lanyard Blvd", lat: -33.6363689, lng: 115.39388889999998 },
  { address: "5 Riedle Close", lat: -33.6330689, lng: 115.386302 },
  { address: "9b Hamelin Retreat", lat: -33.6344008, lng: 115.3910856 },
  { address: "54 Lanyard Blvd", lat: -33.6355893, lng: 115.39708080000001 },
  { address: "13 Keel Retreat", lat: -33.6330945, lng: 115.39748010000001 },
  { address: "8 Lanyard Blvd", lat: -33.6361268, lng: 115.3932274 },
  { address: "14/33 Spinnaker Blvd", lat: -33.6303189, lng: 115.3929733 },
  {
    address: "Unit 7, 65 Spinnaker Blvd",
    lat: -33.6314996,
    lng: 115.39140789999999,
  },
  { address: "35 Lanyard Blvd", lat: -33.6349355, lng: 115.39695509999999 },
  { address: "18 Headstay Cove", lat: -33.6372004, lng: 115.38998190000001 },
  { address: "411 Marine Terrace", lat: -33.6337766, lng: 115.3850509 },
  { address: "8 Plover Court", lat: -33.6343823, lng: 115.38634590000001 },
  { address: "11 Pebble Drive", lat: -33.638194, lng: 115.38679739999999 },
  { address: "1 Plover Court", lat: -33.6350009, lng: 115.3861582 },
  { address: "12 Anchor View", lat: -33.6315947, lng: 115.3964518 },
  { address: "416 Marine Terrace", lat: -33.6344856, lng: 115.38698749999998 },
  { address: "41 Spinnaker Blvd", lat: -33.6304744, lng: 115.3921374 },
  { address: "48 Keel Retreat", lat: -33.6336431, lng: 115.39329059999999 },
  { address: "8 Mainsail Street", lat: -33.631360799999996, lng: 115.3974274 },
  {
    address: "62 Harwood Road",
    lat: -33.634464699999995,
    lng: 115.38873249999999,
  },
  { address: "2 Ransonnet Dr", lat: -33.6356932, lng: 115.3882551 },
  { address: "21 Mainsail Street", lat: -33.6308092, lng: 115.3965855 },
  { address: "20 Mainsail Street", lat: -33.6305054, lng: 115.39696490000001 },
  { address: "35 Keel Retreat", lat: -33.6342302, lng: 115.39587859999999 },
  { address: "424 Marine Terrace", lat: -33.6353593, lng: 115.38742959999999 },
  { address: "6 Heirisson Retreat", lat: -33.6350812, lng: 115.389118 },
  {
    address: "22 Seahorse Crescent",
    lat: -33.6393919,
    lng: 115.38281760000001,
  },
  { address: "5 Lesueur Close", lat: -33.632618799999996, lng: 115.3871228 },
  { address: "412a Marine Terrace", lat: -33.6341427, lng: 115.3867355 },
  { address: "59 Keel Retreat", lat: -33.6343124, lng: 115.393153 },
  { address: "36 Lanyard Blvd", lat: -33.6361255, lng: 115.3956356 },
  {
    address: "6 Medusa Way",
    lat: -33.638676600000004,
    lng: 115.38510679999999,
  },
  { address: "32 Keel Retreat", lat: -33.6334534, lng: 115.3953741 },
  { address: "14 Blue Manna Mews", lat: -33.6285196, lng: 115.39776839999999 },
  {
    address: "U4 of 62 Keel Retreat",
    lat: -33.632927099999996,
    lng: 115.3924508,
  },
  {
    address: "Unit 9 65 Spinnaker Blvd",
    lat: -33.6314996,
    lng: 115.39140789999999,
  },
  { address: "17 Masthead Loop", lat: -33.6304251, lng: 115.3972472 },
  { address: "65 Spinnaker Blvd", lat: -33.63142, lng: 115.3911885 },
  { address: "67 Keel Retreat", lat: -33.6340457, lng: 115.39238870000001 },
  { address: "418 Marine Terrace", lat: -33.6346766, lng: 115.38703089999998 },
  { address: "24 Keel Retreat", lat: -33.6334969, lng: 115.39622299999999 },
  { address: "71 Keel Retreat", lat: -33.633792299999996, lng: 115.3921944 },
  { address: "31A Keel Retreat", lat: -33.6342162, lng: 115.3963105 },
  {
    address: "3 Levillian Retreat",
    lat: -33.634163099999995,
    lng: 115.38777209999999,
  },
  { address: "9 Keel Retreat", lat: -33.6327218, lng: 115.39759579999999 },
  { address: "20 Pavillion Crescent", lat: -33.6409401, lng: 115.3804929 },
  {
    address: "4 Heirisson Retreat",
    lat: -33.635176099999995,
    lng: 115.38885080000001,
  },
  { address: "28 Lanyard Blvd", lat: -33.6363875, lng: 115.3948712 },
  {
    address: "36 Spinnaker Blvd",
    lat: -33.62881670000001,
    lng: 115.39349949999998,
  },
  {
    address: "17 Keel Retreat",
    lat: -33.633458499999996,
    lng: 115.39743089999999,
  },
  { address: "16 Portage Way", lat: -33.6419041, lng: 115.38174470000001 },
  { address: "4 Mussel Court", lat: -33.6370685, lng: 115.3881883 },
  { address: "Spinnaker Blvd", lat: -33.6291725, lng: 115.393581 },
  {
    address: "Unit 4, 24 Freycinet Drive",
    lat: -33.632605399999996,
    lng: 115.3893512,
  },
  { address: "61 Lanyard Blvd", lat: -33.633448, lng: 115.398629 },
  { address: "10 Windward Green", lat: -33.636823899999996, lng: 115.3978945 },
  {
    address: "8 Lesueur Close",
    lat: -33.632149999999996,
    lng: 115.38750580000001,
  },
  { address: "21 Bream Quadrant", lat: -33.6294088, lng: 115.3976141 },
  { address: "408 Marine Terrace", lat: -33.634126800000004, lng: 115.3861292 },
  { address: "14 Anchor View", lat: -33.6317439, lng: 115.39636929999999 },
  { address: "16 Burgee Cove", lat: -33.635902699999995, lng: 115.3899703 },
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function createTestUser(db: DatabaseWriter, usedUserNames: Set<string>) {
  let userName: string;
  let attempts = 0;
  const maxAttempts = mockUserNames.length;

  do {
    userName = getRandomElement(mockUserNames);
    attempts++;
    if (attempts > maxAttempts) {
      userName = `${getRandomElement(mockUserNames)} ${Math.floor(Math.random() * 1000)}`;
      break;
    }
  } while (usedUserNames.has(userName));

  usedUserNames.add(userName);

  const emailName = userName.toLowerCase().replace(/\s+/g, ".");
  const email = `${emailName}@testuser.example.com`;

  const userId = await db.insert("users", {
    name: userName,
    email: email,
    isTestUser: true,
    emailVerificationTime: Date.now(),
  });

  return userId;
}

function generateMockEntry(usedAddresses: Set<string>) {
  const name = getRandomElement(mockNames);

  let addressWithCoords: { address: string; lat: number; lng: number };
  let attempts = 0;
  const maxAttempts = mockAddressesWithCoords.length;

  do {
    addressWithCoords = getRandomElement(mockAddressesWithCoords);
    attempts++;
    if (attempts > maxAttempts) {
      addressWithCoords = mockAddressesWithCoords[0];
      break;
    }
  } while (usedAddresses.has(addressWithCoords.address));

  usedAddresses.add(addressWithCoords.address);

  return {
    name,
    houseAddress: {
      address: addressWithCoords.address,
      lat: addressWithCoords.lat,
      lng: addressWithCoords.lng,
      placeId: "pid-test",
    },
    numPhotos: getRandomNumber(1, 4),
  };
}

export const createMockEntries = async (
  ctx: MutationCtx,
  args: { count: number },
) => {
  const entryCount = args.count || 10;

  const createdEntries = [];
  const usedAddresses = new Set<string>();
  const usedUserNames = new Set<string>();

  for (let i = 0; i < entryCount; i++) {
    const testUserId = await createTestUser(ctx.db, usedUserNames);

    const mockData = generateMockEntry(usedAddresses);
    const entryNumber = await entries.mutate(ctx).getNextAvailableEntryNumber();

    // Generate mock photos
    const mockPhotos: Array<{ kind: "mock"; mockPath: string }> = [];
    const availableMockPhotos = [
      "1.jpg",
      "2.jpg",
      "3.jpg",
      "4.jpg",
      "5.jpg",
      "6.jpg",
      "7.jpg",
      "8.jpg",
      "9.jpg",
      "10.jpg",
    ];

    const numPhotos = mockData.numPhotos;
    const shuffled = [...availableMockPhotos].sort(() => Math.random() - 0.5);
    for (let j = 0; j < numPhotos && j < shuffled.length; j++)
      mockPhotos.push({
        kind: "mock" as const,
        mockPath: shuffled[j],
      });

    const entryId = await ctx.db.insert("entries", {
      name: mockData.name,
      houseAddress: mockData.houseAddress,
      status: "approved",
      submittedByUserId: testUserId,
      submittedAt: Date.now(),
      approvedAt: Date.now(),
      entryNumber,
    });

    // Create photos separately
    for (let j = 0; j < mockPhotos.length; j++)
      await ctx.db.insert("photos", {
        entryId,
        ...mockPhotos[j],
      });

    const testUser = await ctx.db.get(testUserId);

    const userInfo =
      testUser && "name" in testUser && "email" in testUser
        ? {
            id: testUserId,
            name: testUser.name,
            email: testUser.email,
          }
        : {
            id: testUserId,
            name: "Unknown User",
            email: "unknown@testuser.example.com",
          };

    createdEntries.push({
      id: entryId,
      name: mockData.name,
      houseAddress: mockData.houseAddress,
      entryNumber,
      photoCount: mockPhotos.length,
      testUser: userInfo,
    });
  }

  return createdEntries;
};
