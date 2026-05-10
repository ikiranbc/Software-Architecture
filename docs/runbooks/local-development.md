# Local Development Runbook

## 1. Install
```bash
npm install
```

## 2. Start stack
```bash
npm start
```

## 3. Health checks
```bash
./scripts/healthcheck.sh
```

## 4. Seed users
- `superadmin@hotel.local` / `SuperAdmin@123`
- `admin@hotel.local` / `Admin@12345`
- `user@hotel.local` / `User@12345`

## 5. Payment flow test
1. Login as `user`
2. Top up wallet
3. Search hotels
4. Book room and confirm booking
5. Proceed payment
6. Verify success popup and `CONFIRMED` booking
