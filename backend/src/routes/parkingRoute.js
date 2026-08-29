import { Router } from 'express';
import {
  getParkings,
  searchParkings,
  getRoute,
  autocomplete,
  bookParking,
  cancelBookingController,
  myBookings
} from '../controllers/parkingController.js';

const router = Router();

router.get('/', getParkings);
router.get('/search', searchParkings);
router.get('/autocomplete', autocomplete);
router.get('/route', getRoute);

router.post('/book', bookParking);
router.post('/book/cancel', cancelBookingController);
router.get('/book/mine', myBookings);

export default router;
