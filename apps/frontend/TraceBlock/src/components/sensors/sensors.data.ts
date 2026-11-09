import type { SensorAlert, SensorRecord } from "./sensors.type";

export const sensorRecords: SensorRecord[] = [
  {
    id: 1,
    source: "Sensor IoT",
    product: "Café Especial Torrado",
    lot: "LOTE-2026-001",
    temperature: 18.4,
    humidity: 61,
    location: "Rod. Anhanguera, km 90",
    date: "18/03/2026",
    time: "14:30",
    responsible: "TransLog Brasil",
  },
  {
    id: 2,
    source: "Sensor IoT",
    product: "Vacina Imunovax 10ml",
    lot: "LOTE-2026-014",
    temperature: 4.2,
    humidity: 48,
    location: "CD Campinas · Câmara 02",
    date: "18/03/2026",
    time: "14:28",
    responsible: "CD Campinas",
  },
  {
    id: 3,
    source: "Manual",
    product: "Chocolate 70% Cacau",
    lot: "LOTE-2026-009",
    temperature: 21.1,
    humidity: 58,
    location: "Jundiaí, SP",
    date: "18/03/2026",
    time: "13:50",
    responsible: "Distribuidora Nacional",
  },
  {
    id: 4,
    source: "Sensor IoT",
    product: "Café Especial Torrado",
    lot: "LOTE-2026-001",
    temperature: 24.8,
    humidity: 68,
    location: "Jundiaí, SP",
    date: "17/03/2026",
    time: "16:42",
    responsible: "TransLog Brasil",
  },
  {
    id: 5,
    source: "Sensor IoT",
    product: "Café Especial Torrado",
    lot: "LOTE-2026-001",
    temperature: 19.2,
    humidity: 72,
    location: "Extrema, MG",
    date: "16/03/2026",
    time: "22:18",
    responsible: "TransLog Brasil",
  },
];

export const sensorAlerts: SensorAlert[] = [
  {
    id: 1,
    title: "Temperatura acima do limite",
    description: "24,8 °C detectado por 12 minutos.",
    date: "17 mar · 16:42",
    location: "Jundiaí, SP",
    severity: "high",
  },
  {
    id: 2,
    title: "Variação de umidade",
    description: "Pico de 72% registrado durante parada.",
    date: "16 mar · 22:18",
    location: "Extrema, MG",
    severity: "medium",
  },
];

export const sensorLots = [
  {
    value: "LOTE-2026-001",
    label: "LOTE-2026-001 · Café Especial",
  },
  {
    value: "LOTE-2026-014",
    label: "LOTE-2026-014 · Vacina Imunovax",
  },
  {
    value: "LOTE-2026-009",
    label: "LOTE-2026-009 · Chocolate",
  },
  {
    value: "all",
    label: "Todos os lotes",
  },
];