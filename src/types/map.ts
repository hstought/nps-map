export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

export interface BBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export type MapStyleKey = "liberty";

export interface MapStyleConfig {
  name: string;
  url: string;
}
