/**
 * A property for our purposes is the unit recorded with the relevant
 * authorities (e.g., county assessors in California).
 */
{
  /**
   * The primary address of the property.
   *
   * The address should be as verbose and complete as possible, with proper
   * capitalization and no abbreviations.
   */
  "address": "40 Sharon Street",

  /**
   * The city in which the property is located.
   *
   * If the property is not within a city, this field may be null.
   */
  "city": "San Francisco",

  /**
   * The postal code (e.g., zipcode) of the property
   *
   */
  "postalCode": "94114",

  /**
   * The second-level administrative district of the property (e.g., county).
   */
  "admin2": "San Francisco",

  /**
   * The abbreviation of the state in which the property is located.
   */
  "admin1": "CA",

  /**
   * The three-character ISO-3166 country code of the property.
   */
  "admin0": "USA",

  /**
   * The residential area of the property in square feet.
   *
   * 0 means that there is no residential area
   * null means that the area is not known
   */
  "residentialArea": 1193,

  /**
   *
   */
  "bedrooms": 2,

  /**
   * The area of the land on which the property sits in square feet.
   *
   */
  "parcelArea": 4900
}
