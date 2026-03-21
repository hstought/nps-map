import type { NpsApiPark } from "@/lib/data/nps-api";
import type {
  CurrentWeather,
  ParkBoundaryCollection,
  ParkContacts,
  ParkDetail,
  ParkEntranceFee,
  ParkImage,
  ParkOperatingHours,
  ParkSearchResult,
} from "@/types/park";

export function createMockParkDetail(
  overrides: Partial<ParkDetail> = {},
): ParkDetail {
  return {
    unitCode: "YELL",
    fullName: "Yellowstone National Park",
    description: "The first national park in the world.",
    designation: "National Park",
    state: "WY,MT,ID",
    url: "https://www.nps.gov/yell/index.htm",
    weatherInfo: "Yellowstone weather varies significantly.",
    latitude: 44.6,
    longitude: -110.5,
    images: [createMockImage()],
    activities: [{ id: "1", name: "Hiking" }],
    topics: [{ id: "1", name: "Geysers" }],
    entranceFees: [createMockEntranceFee()],
    operatingHours: [createMockOperatingHours()],
    contacts: createMockContacts(),
    directionsInfo: "From the north, take US-89.",
    directionsUrl: "https://www.nps.gov/yell/planyourvisit/directions.htm",
    ...overrides,
  };
}

export function createMockImage(overrides: Partial<ParkImage> = {}): ParkImage {
  return {
    url: "https://www.nps.gov/common/uploads/structured_data/photo.jpg",
    credit: "NPS Photo",
    title: "Old Faithful",
    altText: "Old Faithful geyser erupting",
    caption: "Old Faithful erupts approximately every 90 minutes.",
    ...overrides,
  };
}

export function createMockEntranceFee(
  overrides: Partial<ParkEntranceFee> = {},
): ParkEntranceFee {
  return {
    cost: "35.00",
    description: "Admits one single, private, non-commercial vehicle.",
    title: "Private Vehicle",
    ...overrides,
  };
}

export function createMockOperatingHours(
  overrides: Partial<ParkOperatingHours> = {},
): ParkOperatingHours {
  return {
    name: "Yellowstone General",
    description: "The park is open year-round.",
    standardHours: {
      monday: "All Day",
      tuesday: "All Day",
      wednesday: "All Day",
      thursday: "All Day",
      friday: "All Day",
      saturday: "All Day",
      sunday: "All Day",
    },
    exceptions: [],
    ...overrides,
  };
}

export function createMockContacts(
  overrides: Partial<ParkContacts> = {},
): ParkContacts {
  return {
    phoneNumbers: [
      {
        phoneNumber: "3073447381",
        description: "General park information",
        extension: "",
        type: "Voice",
      },
    ],
    emailAddresses: [
      {
        emailAddress: "yell_visitor_services@nps.gov",
        description: "General inquiries",
      },
    ],
    ...overrides,
  };
}

export function createMockSearchResult(
  overrides: Partial<ParkSearchResult> = {},
): ParkSearchResult {
  return {
    unitCode: "YELL",
    unitName: "Yellowstone National Park",
    unitType: "National Park",
    state: "WY",
    latitude: 44.6,
    longitude: -110.5,
    ...overrides,
  };
}

export function createMockWeather(
  overrides: Partial<CurrentWeather> = {},
): CurrentWeather {
  return {
    tempF: 72,
    feelsLikeF: 70,
    conditionText: "Sunny",
    conditionIcon: "https://cdn.weatherapi.com/weather/64x64/day/113.png",
    humidity: 30,
    windMph: 8,
    windDir: "NW",
    ...overrides,
  };
}

export function createMockBoundaryCollection(
  count = 2,
): ParkBoundaryCollection {
  const features = Array.from({ length: count }, (_, i) => ({
    type: "Feature" as const,
    properties: {
      unitCode: `PARK${i}`,
      unitName: `Test Park ${i}`,
      parkName: `Test Park ${i}`,
      unitType: "National Park",
      state: "WY",
      region: "Mountain",
    },
    geometry: {
      type: "MultiPolygon" as const,
      coordinates: [
        [
          [
            [-110.5 + i, 44.6],
            [-110.4 + i, 44.6],
            [-110.4 + i, 44.7],
            [-110.5 + i, 44.7],
            [-110.5 + i, 44.6],
          ],
        ],
      ],
    },
  }));

  return { type: "FeatureCollection", features };
}

export function createMockNpsApiPark(
  overrides: Partial<NpsApiPark> = {},
): NpsApiPark {
  return {
    id: "park-123",
    parkCode: "yell",
    fullName: "Yellowstone National Park",
    name: "Yellowstone",
    description: "First national park.",
    designation: "National Park",
    states: "WY,MT,ID",
    latitude: "44.6",
    longitude: "-110.5",
    url: "https://www.nps.gov/yell/index.htm",
    weatherInfo: "Weather varies.",
    directionsInfo: "From the north...",
    directionsUrl: "https://www.nps.gov/yell/planyourvisit/directions.htm",
    images: [
      {
        url: "https://www.nps.gov/common/uploads/photo.jpg",
        credit: "NPS",
        title: "Old Faithful",
        altText: "Old Faithful erupting",
        caption: "Caption",
      },
    ],
    activities: [{ id: "1", name: "Hiking" }],
    topics: [{ id: "1", name: "Geysers" }],
    entranceFees: [
      { cost: "35.00", description: "Vehicle fee", title: "Private Vehicle" },
    ],
    operatingHours: [
      {
        name: "General",
        description: "Open year-round",
        standardHours: {
          monday: "All Day",
          tuesday: "All Day",
          wednesday: "All Day",
          thursday: "All Day",
          friday: "All Day",
          saturday: "All Day",
          sunday: "All Day",
        },
        exceptions: [],
      },
    ],
    contacts: {
      phoneNumbers: [
        {
          phoneNumber: "3073447381",
          description: "Info",
          extension: "",
          type: "Voice",
        },
      ],
      emailAddresses: [
        { emailAddress: "yell@nps.gov", description: "General" },
      ],
    },
    ...overrides,
  };
}
