export type ObjectType = 'background' | 'prop' | 'tile';
export type EditorTool = 'select' | 'place' | 'pan';

export interface PaletteObject {
  id: string;
  name: string;
  type: ObjectType;
  imageSrc: string;
  width: number;
  height: number;
  assignedNumber?: number;
  numberOffsetX?: number;
  numberOffsetY?: number;
}

export interface MapObject {
  id: string; // uuid for map instance
  paletteObjectId: string; // reference to palette
  // Intrinsic properties mapped from palette object for independent json export
  name: string;
  type: ObjectType;
  imageSrc: string;
  width: number;
  height: number;
  assignedNumber?: number;
  numberOffsetX?: number;
  numberOffsetY?: number;
  
  // Placement properties
  x: number;
  y: number;
  zIndex: number;
}
