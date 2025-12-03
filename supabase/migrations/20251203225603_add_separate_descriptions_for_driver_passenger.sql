/*
  # Separate Descriptions for Driver and Passenger Apps

  ## Changes
  This migration adds separate description fields for driver and passenger apps.

  ### New Fields Added
  - `playstore_driver_short_description` (text) - Short description for driver app on Play Store
  - `playstore_driver_long_description` (text) - Long description for driver app on Play Store
  - `playstore_passenger_short_description` (text) - Short description for passenger app on Play Store
  - `playstore_passenger_long_description` (text) - Long description for passenger app on Play Store
  - `appstore_driver_description` (text) - Description for driver app on App Store
  - `appstore_passenger_description` (text) - Description for passenger app on App Store

  ### Fields Removed
  - `short_description` - No longer needed in setup section
  - `long_description` - No longer needed in setup section
  - `playstore_short_description` - Replaced by driver/passenger specific fields
  - `playstore_long_description` - Replaced by driver/passenger specific fields
  - `appstore_description` - Replaced by driver/passenger specific fields

  ## Notes
  - Each app (driver and passenger) now has its own set of descriptions
  - This allows for more targeted marketing for each user type
*/

-- Add new fields for driver app descriptions
ALTER TABLE app_forms 
  ADD COLUMN IF NOT EXISTS playstore_driver_short_description text,
  ADD COLUMN IF NOT EXISTS playstore_driver_long_description text,
  ADD COLUMN IF NOT EXISTS appstore_driver_description text;

-- Add new fields for passenger app descriptions
ALTER TABLE app_forms 
  ADD COLUMN IF NOT EXISTS playstore_passenger_short_description text,
  ADD COLUMN IF NOT EXISTS playstore_passenger_long_description text,
  ADD COLUMN IF NOT EXISTS appstore_passenger_description text;

-- Drop old generic description fields
ALTER TABLE app_forms 
  DROP COLUMN IF EXISTS short_description,
  DROP COLUMN IF EXISTS long_description,
  DROP COLUMN IF EXISTS playstore_short_description,
  DROP COLUMN IF EXISTS playstore_long_description,
  DROP COLUMN IF EXISTS appstore_description;