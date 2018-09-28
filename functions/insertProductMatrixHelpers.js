"use strict";

const _ = require("lodash");

module.exports = {
  insertProductVariant,
  createAttributeVariantValues,
  createAttributeValues
};

let reqs = {
  method: "POST",
  resolveWithFullResponse: true
};

function insertProductVariant(variant) {
  let options = JSON.parse(JSON.stringify(variant.options));
  delete variant.options;

  reqs.uri = `${this.baseUri}?target=RESTAPI&_key=${
    this.channelProfile.channelAuthValues.apiKey
  }&_schema=default&_path=xc-productvariants-productvariant/0`;
  reqs.body = variant;

  this.info(`Requesting [${reqs.method} ${reqs.uri}]`);

  return this.request(reqs)
    .then(response => {
      this.info(`Variant Inserted with ID: ${response.body.id}`);
      variant.id = response.body.id;
      variant.options = options;
    })
    .catch(this.handleRejection.bind(this));
}

async function createAttributeVariantValues(variants, payload) {
  reqs.uri = `${this.baseUri}?target=RESTAPI&_key=${
    this.channelProfile.channelAuthValues.apiKey
  }&_schema=default&_path=attributevalue-attributevalueselect/0`;
  this.info(`Processing Attribute Values`);
  let attributes = [];

  variants.forEach(variant => {
    variant.options.forEach(option => {
      attributes.push(option);
    });
  });

  attributes = _.uniqWith(attributes, _.isEqual);

  for (let i = 0; i < attributes.length; i++) {
    let vars = [];
    variants.forEach(variant => {
      variant.options.forEach(option => {
        if (
          attributes[i].attribute_id === option.attribute_id &&
          attributes[i].attribute_option_id === option.attribute_option_id
        ) {
          vars.push({ id: variant.id });
        }
      });
    });

    let attributeValue = {
      variants: vars,
      attribute_option: {
        id: attributes[i].attribute_option_id
      },
      product: {
        product_id: payload.doc.product_id
      },
      attribute: {
        id: attributes[i].attribute_id
      }
    };

    reqs.body = attributeValue;

    this.info(`Requesting [${reqs.method} ${reqs.uri}]`);
    let response = await this.request(reqs).catch(this.handleRejection.bind(this));

    this.info(`Attribute Value Inserted with ID: ${response.body.id}`);
  }
}

async function createAttributeValues(attributeValues, payload) {
  for (let i = 0; i < attributeValues.length; i++) {
    let attributeValue = {
      product: {
        product_id: payload.doc.product_id
      },
      attribute: {
        id: attributeValues[i].attribute_id
      }
    };

    let attributeUrl = `${this.baseUri}?target=RESTAPI&_key=${
      this.channelProfile.channelAuthValues.apiKey
    }&_schema=default&_path=`;

    switch (attributeValues[i].type) {
      case "S":
        attributeUrl = `${attributeUrl}attributevalue-attributevalueselect/0`;
        attributeValue.attribute_option_id = attributeValues[i].attribute_option_id;
        break;

      case "C":
        attributeUrl = `${attributeUrl}attributevalue-attributevaluecheckbox/0`;
        attributeValue.value = attributeValues[i].value;
        break;

      case "T":
        attributeUrl = `${attributeUrl}attributevalue-attributevaluetext/0`;
        attributeValue.translations = attributeValues[i].translations;
        break;

      default:
        throw new Error(`An Attribute Value under the Product does not have a 'type' field.`);
    }

    reqs.uri = attributeUrl;
    reqs.body = attributeValue;

    this.info(`Requesting [${reqs.method} ${reqs.uri}]`);

    let response = await this.request(reqs).catch(this.handleRejection.bind(this));

    this.info(`Attribute of type '${attributeValues[i].type}' Value Inserted with ID: ${response.body.id}`);
  }
}
