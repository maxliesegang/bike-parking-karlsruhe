export interface DistrictInfo {
  name: string;
  population: number;
  areaKm2: number;
}

const level9Districts: DistrictInfo[] = [
  { name: "Durlach", population: 30773, areaKm2: 22.86 },
  { name: "Neureut", population: 18973, areaKm2: 19.22 },
  { name: "Grötzingen", population: 8982, areaKm2: 11.33 },
  { name: "Stupferich", population: 2949, areaKm2: 6.46 },
  { name: "Hohenwettersbach", population: 2982, areaKm2: 4.12 },
  { name: "Wolfartsweier", population: 3107, areaKm2: 1.88 },
  { name: "Wettersbach", population: 6048, areaKm2: 7.62 },
];

const level10Districts: DistrictInfo[] = [
  { name: "Innenstadt-Ost", population: 6365, areaKm2: 1.6 },
  { name: "Innenstadt-West", population: 9848, areaKm2: 2.41 },
  { name: "Südstadt", population: 19917, areaKm2: 2.14 },
  { name: "Südweststadt", population: 20783, areaKm2: 2.98 },
  { name: "Weststadt", population: 19765, areaKm2: 1.73 },
  { name: "Nordweststadt", population: 11502, areaKm2: 3.51 },
  { name: "Oststadt", population: 19353, areaKm2: 5.27 },
  { name: "Mühlburg", population: 16454, areaKm2: 5.27 },
  { name: "Daxlanden", population: 11198, areaKm2: 10.92 },
  { name: "Knielingen", population: 11438, areaKm2: 20.63 },
  { name: "Grünwinkel", population: 11208, areaKm2: 4.4 },
  { name: "Oberreut", population: 9972, areaKm2: 2.43 },
  { name: "Beiertheim-Bulach", population: 7006, areaKm2: 2.88 },
  { name: "Weiherfeld-Dammerstock", population: 5870, areaKm2: 3.05 },
  { name: "Rüppurr", population: 10820, areaKm2: 6.99 },
  { name: "Waldstadt", population: 12075, areaKm2: 10.38 },
  { name: "Rintheim", population: 6257, areaKm2: 3.35 },
  { name: "Hagsfeld", population: 7043, areaKm2: 7.29 },
  { name: "Grünwettersbach", population: 4091, areaKm2: 6.26 },
  { name: "Palmbach", population: 1957, areaKm2: 1.36 },
  { name: "Nordstadt", population: 9210, areaKm2: 2.66 },
];

export const districtLookup = new Map<string, DistrictInfo>();

for (const d of level9Districts) districtLookup.set(d.name, d);
for (const d of level10Districts) districtLookup.set(d.name, d);
