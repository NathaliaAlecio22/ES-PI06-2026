export type SensorSource = "Sensor IoT" | "Manual";

export interface SensorRecord {
  id: number;
  source: SensorSource;
  product: string;
  lot: string;
  temperature: number;
  humidity: number;
  location: string;
  date: string;
  time: string;
  responsible: string;
}

export interface SensorAlert {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  severity: "high" | "medium";
}