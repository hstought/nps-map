const NPS_API_BASE = "https://developer.nps.gov/api/v1";

interface NpsApiPark {
  id: string;
  parkCode: string;
  fullName: string;
  name: string;
  description: string;
  designation: string;
  states: string;
  latitude: string;
  longitude: string;
  url: string;
  weatherInfo: string;
  directionsInfo: string;
  directionsUrl: string;
  images: Array<{
    url: string;
    credit: string;
    title: string;
    altText: string;
    caption: string;
  }>;
  activities: Array<{ id: string; name: string }>;
  topics: Array<{ id: string; name: string }>;
  entranceFees: Array<{
    cost: string;
    description: string;
    title: string;
  }>;
  operatingHours: Array<{
    name: string;
    description: string;
    standardHours: Record<string, string>;
    exceptions: Array<{
      name: string;
      startDate: string;
      endDate: string;
      exceptionHours: Record<string, string>;
    }>;
  }>;
  contacts: {
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
  };
}

interface NpsApiResponse {
  total: string;
  limit: string;
  start: string;
  data: NpsApiPark[];
}

/**
 * Fetch all parks from the NPS API, paginated.
 * Returns the full array of park data.
 */
export async function fetchAllParksFromNpsApi(
  apiKey: string,
): Promise<NpsApiPark[]> {
  const allParks: NpsApiPark[] = [];
  const limit = 50;
  let start = 0;
  let total = Infinity;

  while (start < total) {
    const url = `${NPS_API_BASE}/parks?limit=${limit}&start=${start}&api_key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `NPS API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data: NpsApiResponse = await response.json();
    total = parseInt(data.total, 10);
    allParks.push(...data.data);
    start += limit;

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return allParks;
}

export type { NpsApiPark };
