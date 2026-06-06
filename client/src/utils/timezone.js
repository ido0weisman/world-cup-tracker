// Maps each country name (as stored in the users table) to its primary IANA timezone.
// For countries with multiple timezones, the capital / most-populated timezone is used.
const COUNTRY_TIMEZONES = {
  'Afghanistan':              'Asia/Kabul',
  'Albania':                  'Europe/Tirane',
  'Algeria':                  'Africa/Algiers',
  'Argentina':                'America/Argentina/Buenos_Aires',
  'Armenia':                  'Asia/Yerevan',
  'Australia':                'Australia/Sydney',
  'Austria':                  'Europe/Vienna',
  'Azerbaijan':               'Asia/Baku',
  'Bahrain':                  'Asia/Bahrain',
  'Bangladesh':               'Asia/Dhaka',
  'Belarus':                  'Europe/Minsk',
  'Belgium':                  'Europe/Brussels',
  'Bolivia':                  'America/La_Paz',
  'Bosnia and Herzegovina':   'Europe/Sarajevo',
  'Brazil':                   'America/Sao_Paulo',
  'Bulgaria':                 'Europe/Sofia',
  'Cameroon':                 'Africa/Douala',
  'Canada':                   'America/Toronto',
  'Chile':                    'America/Santiago',
  'China':                    'Asia/Shanghai',
  'Colombia':                 'America/Bogota',
  'Costa Rica':               'America/Costa_Rica',
  'Croatia':                  'Europe/Zagreb',
  'Cuba':                     'America/Havana',
  'Czech Republic':           'Europe/Prague',
  'Denmark':                  'Europe/Copenhagen',
  'Ecuador':                  'America/Guayaquil',
  'Egypt':                    'Africa/Cairo',
  'El Salvador':              'America/El_Salvador',
  'Estonia':                  'Europe/Tallinn',
  'Ethiopia':                 'Africa/Addis_Ababa',
  'Finland':                  'Europe/Helsinki',
  'France':                   'Europe/Paris',
  'Germany':                  'Europe/Berlin',
  'Ghana':                    'Africa/Accra',
  'Greece':                   'Europe/Athens',
  'Guatemala':                'America/Guatemala',
  'Honduras':                 'America/Tegucigalpa',
  'Hungary':                  'Europe/Budapest',
  'India':                    'Asia/Kolkata',
  'Indonesia':                'Asia/Jakarta',
  'Iran':                     'Asia/Tehran',
  'Iraq':                     'Asia/Baghdad',
  'Ireland':                  'Europe/Dublin',
  'Israel':                   'Asia/Jerusalem',
  'Italy':                    'Europe/Rome',
  'Jamaica':                  'America/Jamaica',
  'Japan':                    'Asia/Tokyo',
  'Jordan':                   'Asia/Amman',
  'Kazakhstan':               'Asia/Almaty',
  'Kenya':                    'Africa/Nairobi',
  'Kuwait':                   'Asia/Kuwait',
  'Latvia':                   'Europe/Riga',
  'Lebanon':                  'Asia/Beirut',
  'Lithuania':                'Europe/Vilnius',
  'Malaysia':                 'Asia/Kuala_Lumpur',
  'Mexico':                   'America/Mexico_City',
  'Moldova':                  'Europe/Chisinau',
  'Morocco':                  'Africa/Casablanca',
  'Netherlands':              'Europe/Amsterdam',
  'New Zealand':              'Pacific/Auckland',
  'Nigeria':                  'Africa/Lagos',
  'North Korea':              'Asia/Pyongyang',
  'Norway':                   'Europe/Oslo',
  'Oman':                     'Asia/Muscat',
  'Pakistan':                 'Asia/Karachi',
  'Panama':                   'America/Panama',
  'Paraguay':                 'America/Asuncion',
  'Peru':                     'America/Lima',
  'Philippines':              'Asia/Manila',
  'Poland':                   'Europe/Warsaw',
  'Portugal':                 'Europe/Lisbon',
  'Qatar':                    'Asia/Qatar',
  'Romania':                  'Europe/Bucharest',
  'Russia':                   'Europe/Moscow',
  'Saudi Arabia':             'Asia/Riyadh',
  'Senegal':                  'Africa/Dakar',
  'Serbia':                   'Europe/Belgrade',
  'Singapore':                'Asia/Singapore',
  'Slovakia':                 'Europe/Bratislava',
  'Slovenia':                 'Europe/Ljubljana',
  'South Africa':             'Africa/Johannesburg',
  'South Korea':              'Asia/Seoul',
  'Spain':                    'Europe/Madrid',
  'Sri Lanka':                'Asia/Colombo',
  'Sweden':                   'Europe/Stockholm',
  'Switzerland':              'Europe/Zurich',
  'Syria':                    'Asia/Damascus',
  'Taiwan':                   'Asia/Taipei',
  'Thailand':                 'Asia/Bangkok',
  'Tunisia':                  'Africa/Tunis',
  'Turkey':                   'Europe/Istanbul',
  'UAE':                      'Asia/Dubai',
  'Uganda':                   'Africa/Kampala',
  'Ukraine':                  'Europe/Kiev',
  'United Kingdom':           'Europe/London',
  'United States':            'America/New_York',
  'Uruguay':                  'America/Montevideo',
  'Uzbekistan':               'Asia/Tashkent',
  'Venezuela':                'America/Caracas',
  'Vietnam':                  'Asia/Ho_Chi_Minh',
  'Yemen':                    'Asia/Aden',
};

/**
 * Returns the IANA timezone string for a given country name.
 * Falls back to undefined (= browser local time) if the country isn't mapped.
 */
export function getTimezoneForCountry(country) {
  if (!country) return undefined;
  return COUNTRY_TIMEZONES[country] ?? undefined;
}

/**
 * Returns a short timezone label to show next to match times, e.g. "IST", "ET".
 * Uses Intl.DateTimeFormat to get the abbreviated timezone name.
 */
export function getTimezoneLabel(timezone) {
  if (!timezone) return null;
  try {
    return new Intl.DateTimeFormat('en', { timeZone: timezone, timeZoneName: 'short' })
      .formatToParts(new Date())
      .find(p => p.type === 'timeZoneName')?.value ?? null;
  } catch {
    return null;
  }
}
