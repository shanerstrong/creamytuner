import { machineById, machines } from '@/src/data/machines';

describe('machine catalog', () => {
  it('keeps six selectable model entries', () => expect(machines).toHaveLength(6));
  it('normalizes NC500 and NC501 to one family', () => {
    expect(machineById('nc500').familyId).toBe('nc500');
    expect(machineById('nc501').familyId).toBe('nc500');
  });
  it('uses the expected container capacities', () => {
    expect(machineById('classic').capacityMl).toBe(473);
    expect(machineById('nc601').capacityMl).toBe(709);
  });
});
