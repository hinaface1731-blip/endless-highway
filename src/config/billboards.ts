import mile48 from '../assets/billboards/mile-48.png';
import trailCoffee from '../assets/billboards/trail-coffee.png';
import northbound from '../assets/billboards/northbound.png';

export interface Advertiser {
  companyName: string;
  image: string;
  url: string;
  color: string;
}

export const advertisers: readonly Advertiser[] = [
  { companyName: 'Mile 48 Motel', image: mile48, url: 'https://example.com/#mile-48', color: '#233f39' },
  { companyName: 'Trail Coffee', image: trailCoffee, url: 'https://example.com/#trail-coffee', color: '#77392b' },
  { companyName: 'Northbound Outfitters', image: northbound, url: 'https://example.com/#northbound', color: '#263845' },
];
