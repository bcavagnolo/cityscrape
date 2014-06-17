/**
 * A sale event for a specific property
 *
 * When a property is sold, this event captures the relevant details.
 */
{

  /**
   * The internal _id of the property that the sale represents
   */
  "propertyId": 123,

  /**
   * The source of the sale data. Currently, only sfgate is supported.
   */
  "source": "sfgate",

  /**
   * The foreign id (if any) used to represent the sale on the source end.
   */
  sourceId: 198321,

  /**
   * The ISO-8601 compliant date of the sale.
   */
  "date": "2012-05-02",

  /**
   * The price paid for the property in U.S. dollars.
   */
  "price": 9000000
}
