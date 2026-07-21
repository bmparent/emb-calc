import { describe, expect, it } from 'vitest';
import { bucketLocationCount, bucketMachineHeads, bucketQuantity } from './analytics';

describe('bucketQuantity', () => {
  it.each([
    [1, '1-12'],
    [12, '1-12'],
    [13, '13-48'],
    [48, '13-48'],
    [49, '49-144'],
    [144, '49-144'],
    [145, '145+'],
  ])('buckets %i without exposing exact order sizes', (quantity, bucket) => {
    expect(bucketQuantity(quantity)).toBe(bucket);
  });
});

describe('coarse production buckets', () => {
  it('groups location and machine sizes before analytics', () => {
    expect([1, 2, 5].map(bucketLocationCount)).toEqual(['1', '2', '3+']);
    expect([1, 4, 12].map(bucketMachineHeads)).toEqual(['1', '2-6', '7+']);
  });
});
