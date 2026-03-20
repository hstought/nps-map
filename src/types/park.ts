// Types for park boundary data (from PostGIS)

export interface ParkBoundaryProperties {
  unitCode: string;
  unitName: string;
  parkName: string | null;
  unitType: string | null;
  state: string | null;
  region: string | null;
}

export interface ParkBoundaryFeature {
  type: "Feature";
  properties: ParkBoundaryProperties;
  geometry: GeoJSON.MultiPolygon;
}

export interface ParkBoundaryCollection {
  type: "FeatureCollection";
  features: ParkBoundaryFeature[];
}

// Types for park search results

export interface ParkSearchResult {
  unitCode: string;
  unitName: string;
  unitType: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
}

// Types for park detail data (from NPS API cache)

export interface ParkImage {
  url: string;
  credit: string;
  title: string;
  altText: string;
  caption: string;
}

export interface ParkActivity {
  id: string;
  name: string;
}

export interface ParkTopic {
  id: string;
  name: string;
}

export interface ParkEntranceFee {
  cost: string;
  description: string;
  title: string;
}

export interface ParkOperatingHours {
  name: string;
  description: string;
  standardHours: Record<string, string>;
  exceptions: Array<{
    name: string;
    startDate: string;
    endDate: string;
    exceptionHours: Record<string, string>;
  }>;
}

export interface ParkContacts {
  phoneNumbers: Array<{
    phoneNumber: string;
    description: string;
    extension: string;
    type: string;
  }>;
  emailAddresses: Array<{
    emailAddress: string;
    description: string;
  }>;
}

export interface ParkDetail {
  unitCode: string;
  fullName: string;
  description: string | null;
  designation: string | null;
  state: string | null;
  url: string | null;
  weatherInfo: string | null;
  latitude: number | null;
  longitude: number | null;
  images: ParkImage[];
  activities: ParkActivity[];
  topics: ParkTopic[];
  entranceFees: ParkEntranceFee[];
  operatingHours: ParkOperatingHours[];
  contacts: ParkContacts;
  directionsInfo: string | null;
  directionsUrl: string | null;
}

// Live weather from WeatherAPI.com

export interface CurrentWeather {
  tempF: number;
  feelsLikeF: number;
  conditionText: string;
  conditionIcon: string;
  humidity: number;
  windMph: number;
  windDir: string;
}
