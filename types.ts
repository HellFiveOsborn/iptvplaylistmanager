export interface Category {
  id: string;
  name: string;
}

export interface Channel {
  id: string;
  name: string;
  logo: string;
  url: string[];
  guide: string;
  category: string;
  country: string;
}

export interface PlaylistData {
  channels: Channel[];
  categories: Category[];
}

export type ViewState = 'channels' | 'categories' | 'export' | 'import';