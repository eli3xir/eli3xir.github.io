import {SKINS} from '../experience/domain.js';

export const ROOM_FINISH=/wall_plaster|ceiling|trim|rug|cork/;

// Preview and full-size room use the same material targets, in linear RGB.
export function roomSkinColor(material,id,target){
  if(!SKINS[id])id='default';
  const original=material.userData.originalColor||material.color;
  return id!=='default'&&ROOM_FINISH.test(material.name)?target.setRGB(...SKINS[id].wall):target.copy(original);
}
