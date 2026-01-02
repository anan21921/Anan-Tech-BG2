
export enum BackgroundColor {
  White = '#ffffff',
  LightBlue = '#ADD8E6',
  Blue = '#007bff',
  Grey = '#D3D3D3',
  OffWhite = '#f8f9fa'
}

export enum DressType {
  None = 'original',
  Custom = 'custom',
  // Men
  FormalSuitBlack = 'black formal suit and tie',
  FormalSuitNavy = 'navy blue formal suit and tie',
  FormalSuitGrey = 'grey formal suit and tie',
  WhiteShirt = 'formal white button-down shirt',
  BlueShirt = 'formal light blue button-down shirt',
  CheckeredShirt = 'formal checkered button-down shirt',
  PoloShirt = 'navy blue polo shirt',
  Panjabi = 'white traditional bengali panjabi',
  BlackPanjabi = 'black traditional bengali panjabi',
  Jubba = 'white islamic thobe',
  Sherwani = 'formal traditional sherwani',
  
  // School Boys
  SchoolShirtWhite = 'white school uniform shirt',

  // Women
  Saree = 'formal saree',
  SalwarKameez = 'formal salwar kameez',
  WomenBlazer = 'black formal blazer for women',
  WomenWhiteShirt = 'white formal shirt for women',
  Hijab = 'black hijab with modest dress',
  Abaya = 'black abaya',
  Kurti = 'simple elegant kurti',

  // School Girls
  SchoolUniformWhite = 'white school uniform salwar kameez',
  SchoolUniformGreen = 'bottle green school uniform salwar kameez',
  SchoolUniformBlue = 'blue school uniform salwar kameez'
}

export type SizePreset = '300x300' | 'passport' | 'custom';

export interface PhotoSettings {
  bgColor: string;
  dress: DressType;
  customDressDescription: string;
  smoothFace: boolean;
  smoothFaceIntensity: number;
  enhanceLighting: boolean;
  brightenFace: boolean; 
  brightenFaceIntensity: number; 
  sizePreset: SizePreset;
  customWidth: number;
  customHeight: number;
}

export interface ProcessingStatus {
  isProcessing: boolean;
  message: string;
  error?: string;
}

// Auth Types
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatar?: string;
  balance: number;
}

// Payment Types
export type RechargeStatus = 'pending' | 'approved' | 'rejected';

export interface RechargeRequest {
    id: string;
    userId: string;
    userName: string;
    amount: number;
    method: 'bkash' | 'nagad';
    senderNumber: string;
    trxId: string;
    status: RechargeStatus;
    date: string;
}