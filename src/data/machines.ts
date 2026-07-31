import type { MachineModel, MachineProgram } from '@/src/types';

const program = (id: string, name: string, description: string, icon: string): MachineProgram => ({ id, name, description, icon });

export const programs = {
  iceCream: program('ice-cream', 'Ice Cream', 'Rich bases with moderate fat and sugar.', 'ice-cream'),
  lite: program('lite-ice-cream', 'Lite Ice Cream', 'Lower-sugar or lower-fat bases.', 'leaf'),
  sorbet: program('sorbet', 'Sorbet', 'Fruit-forward and dairy-free bases.', 'fruit-cherries'),
  gelato: program('gelato', 'Gelato', 'Dense, creamy Italian-style bases.', 'cup'),
  milkshake: program('milkshake', 'Milkshake', 'Thin, drinkable frozen treats.', 'cup-water'),
  smoothie: program('smoothie-bowl', 'Smoothie Bowl', 'Thick, spoonable fruit bowls.', 'bowl-mix'),
  frozenYogurt: program('frozen-yogurt', 'Frozen Yogurt', 'Tangy yogurt-based creations.', 'bowl'),
  creamiFit: program('creamifit', 'CreamiFit', 'Protein-forward lighter recipes.', 'arm-flex'),
  dairyFree: program('dairy-free', 'Dairy-Free', 'Plant-based frozen treats.', 'sprout'),
  frappe: program('frappe', 'Frappe', 'Frozen coffee drinks.', 'coffee'),
  mixIn: program('mix-in', 'Mix-In', 'Fold in chocolate, cookies, fruit, or nuts.', 'plus-circle'),
  italianIce: program('italian-ice', 'Italian Ice', 'Bright, water-based frozen treats.', 'snowflake'),
  frozenDrink: program('frozen-drink', 'Frozen Drink', 'Pourable frozen beverages.', 'cup-outline'),
  slushi: program('slushi', 'Slushi', 'Fine-textured icy drinks.', 'cup-water'),
  softServe: program('soft-serve', 'Soft Serve', 'Classic soft-serve texture.', 'ice-cream'),
  softServeLite: program('soft-serve-lite', 'Soft Serve Lite', 'Lighter soft-serve recipes.', 'ice-cream-off'),
  fruitWhip: program('fruit-whip', 'Fruit Whip', 'Whipped fruit-forward soft serve.', 'fruit-watermelon'),
  frozenCustard: program('frozen-custard', 'Frozen Custard', 'Rich custard-style soft serve.', 'chef-hat'),
} as const;

const classicPrograms = [programs.iceCream, programs.lite, programs.sorbet, programs.gelato, programs.milkshake, programs.smoothie, programs.mixIn];
const deluxePrograms = [programs.iceCream, programs.lite, programs.sorbet, programs.gelato, programs.milkshake, programs.frozenYogurt, programs.frappe, programs.italianIce, programs.frozenDrink, programs.slushi, programs.mixIn];
const xlPrograms = [programs.iceCream, programs.lite, programs.sorbet, programs.gelato, programs.milkshake, programs.frappe, programs.smoothie, programs.frozenYogurt, programs.creamiFit, programs.dairyFree, programs.mixIn];
const swirlPrograms = [programs.iceCream, programs.lite, programs.sorbet, programs.gelato, programs.milkshake, programs.mixIn, programs.softServe, programs.softServeLite, programs.fruitWhip, programs.frozenCustard, programs.frozenYogurt, programs.creamiFit, programs.dairyFree];

export const machines: MachineModel[] = [
  { id: 'nc501', familyId: 'nc500', name: 'Ninja CREAMi Deluxe NC501', shortName: 'NC501', subtitle: 'Deluxe · 11 programs', capacityMl: 709, programs: deluxePrograms },
  { id: 'nc500', familyId: 'nc500', name: 'Ninja CREAMi Deluxe NC500 Series', shortName: 'NC500', subtitle: 'Deluxe family · 11 programs', capacityMl: 709, programs: deluxePrograms },
  { id: 'nc601', familyId: 'nc600', name: 'Ninja CREAMi XL NC601', shortName: 'NC601', subtitle: 'XL · 11 programs', capacityMl: 709, programs: xlPrograms },
  { id: 'classic', familyId: 'nc300', name: 'Ninja CREAMi Classic', shortName: 'Classic', subtitle: 'NC300/350 · 7 programs', capacityMl: 473, programs: classicPrograms },
  { id: 'breeze', familyId: 'nc200', name: 'Ninja CREAMi Breeze', shortName: 'Breeze', subtitle: 'NC100/200 · 7 programs', capacityMl: 473, programs: classicPrograms, isLegacy: true },
  { id: 'swirl', familyId: 'nc700', name: 'Ninja CREAMi Scoop & Swirl', shortName: 'Scoop & Swirl', subtitle: 'NC700 · 13 programs', capacityMl: 473, programs: swirlPrograms },
];

export const machineById = (id: string) => machines.find((machine) => machine.id === id) ?? machines[0];
