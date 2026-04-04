import assert from 'node:assert/strict';
import test from 'node:test';

import { createTransactionRequest, registerUserRequest } from './request.schemas.js';

test('registerUserRequest passes with valid user data', () => {
  const validData = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'securePassword123!',
  };

  const { error } = registerUserRequest.body.validate(validData);
  assert.equal(error, undefined);
});

test('registerUserRequest fails with an invalid email', () => {
  const invalidData = {
    name: 'John Doe',
    email: 'not-an-email',
    password: 'securePassword123!',
  };

  const { error } = registerUserRequest.body.validate(invalidData);
  assert.ok(error);
  assert.match(error.details[0].message, /valid email address/);
});

test('createTransactionRequest passes with a valid transaction', () => {
  const validData = {
    amount: 150.5,
    type: 'income',
    category: 'Salary',
    date: '2023-10-01',
    notes: 'October Salary',
  };

  const { error } = createTransactionRequest.body.validate(validData);
  assert.equal(error, undefined);
});

test('createTransactionRequest fails with an invalid date format', () => {
  const invalidData = {
    amount: 150.5,
    type: 'income',
    category: 'Salary',
    date: '10-01-2023',
  };

  const { error } = createTransactionRequest.body.validate(invalidData);
  assert.ok(error);
  assert.match(error.details[0].message, /YYYY-MM-DD format/);
});

test('createTransactionRequest fails with a negative amount', () => {
  const invalidData = {
    amount: -50,
    type: 'expense',
    category: 'Groceries',
    date: '2023-10-01',
  };

  const { error } = createTransactionRequest.body.validate(invalidData);
  assert.ok(error);
  assert.match(error.details[0].message, /greater than or equal to 0/);
});
