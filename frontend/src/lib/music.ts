export interface Track {
  id: string;
  name: string;
  artist: string;
  url: string;
  coverUrl: string;
}

export const PRESET_SONGS: Track[] = [
  {
    id: '1',
    name: 'Lofi Chill Study',
    artist: 'FASSounds',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: '2',
    name: 'Summer Breeze',
    artist: 'AlexiAction',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: '3',
    name: 'Synthwave Night',
    artist: 'DreamState',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: '4',
    name: 'Acoustic Dreams',
    artist: 'CorporateMusic',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=200'
  }
];
