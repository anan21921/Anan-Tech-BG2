export enum BackgroundColor {
  White = 'white',
  LightBlue = '#ADD8E6',
  Blue = '#007bff',
  Grey = '#D3D3D3',
  OffWhite = '#f8f9fa'
}

export enum DressType {
  None = 'original',
  FormalSuitBlack = 'black formal suit and tie',
  FormalSuitNavy = 'navy blue formal suit and tie',
  WhiteShirt = 'formal white button-down shirt',
  Panjabi = 'white traditional bengali panjabi',
  Saree = 'formal saree',
  SalwarKameez = 'formal salwar kameez',
  WomenBlazer = 'black formal blazer for women'
}

export interface PhotoSettings {
  bgColor: BackgroundColor;
  dress: DressType;
  smoothFace: boolean;
  enhanceLighting: boolean;
}

export interface ProcessingStatus {
  isProcessing: boolean;
  message: string;
  error?: string;
}