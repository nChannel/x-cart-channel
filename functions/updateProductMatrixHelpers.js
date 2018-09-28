"use strict";

const _ = require("lodash");

module.exports = {
  updateProductVariant,
  removeAttributeValues,
  createAttributeValues
};

let reqs = {
  method: "PUT",
  resolveWithFullResponse: true
};

async function updateProductVariant(variant, updatedProduct) {
  let options = JSON.parse(JSON.stringify(variant.options));
  delete variant.options;
  let found = false;

  for (let i = 0; i < updatedProduct.variants.length; i++) {
    if (updatedProduct.variants[i].sku === variant.sku) {
      found = true;
      reqs.uri = `${this.baseUri}?target=RESTAPI&_key=${
        this.channelProfile.channelAuthValues.apiKey
      }&_schema=default&_path=xc-productvariants-productvariant/${updatedProduct.variants[i].id}`;
      reqs.body = variant;

      this.info(`Requesting [${reqs.method} ${reqs.uri}]`);
      return this.request(reqs)
        .then(response => {
          this.info(`Variant Updated with ID: ${updatedProduct.variants[i].id}`);
          variant.id = updatedProduct.variants[i].id;
          variant.options = options;

          return updateAttributeVariantValues.bind(this)(variant, response.body);
        })
        .catch(this.handleRejection.bind(this));
    }
  }

  if (!found) {
    variant.product = {
      product_id: updatedProduct.product_id
    };

    let newReqs = {
      uri: `${this.baseUri}?target=RESTAPI&_key=${
        this.channelProfile.channelAuthValues.apiKey
      }&_schema=default&_path=xc-productvariants-productvariant/0`,
      method: "POST",
      body: variant,
      resolveWithFullResponse: true
    };

    this.info(`Requesting [${newReqs.method} ${newReqs.uri}]`);
    return this.request(newReqs)
      .then(response => {
        this.info(`Variant Inserted with ID: ${response.body.id}`);
        variant.id = response.body.id;
        variant.options = options;

        return createAttributeVariantValues.bind(this)(variant);
      })
      .catch(this.handleRejection.bind(this));
  }
}

function updateAttributeVariantValues(variant, updatedVariant) {
  for (let i = 0; i < updatedVariant.attributeValueS.length; i++) {
    let url = `${this.baseUri}?target=RESTAPI&_key=${
      this.channelProfile.channelAuthValues.apiKey
    }&_schema=default&_path=attributevalue-attributevalueselect/${updatedVariant.attributeValueS[i].id}`;

    let attributeReqs = {
      uri: url,
      method: "GET",
      resolveWithFullResponse: true
    };

    this.info(`Requesting [${attributeReqs.method} ${attributeReqs.uri}]`);
    return this.request(attributeReqs)
      .then(response => {
        let attributeValue = {
          variants: [{ id: variant.id }],
          id: response.body.id,
          product: {
            product_id: response.body.product.product_id
          }
        };

        variant.options.forEach(option => {
          if (
            option.attribute_id === response.body.attribute.id &&
            response.body.attribute_option.id === option.attribute_option_id
          ) {
            attributeValue.attribute_option = { id: option.attribute_option_id };
            attributeValue.attribute = { id: option.attribute_id };
          }
        });

        let updateReqs = {
          uri: url,
          method: "PUT",
          resolveWithFullResponse: true
        };

        this.info(`Requesting [${updateReqs.method} ${updateReqs.uri}]`);
        return this.request(updateReqs)
          .then(response => {
            this.info(`Attribute Value Updated with ID: ${response.body.id}`);
          })
          .catch(this.handleRejection.bind(this));
      })
      .catch(this.handleRejection.bind(this));
  }
}

function createAttributeVariantValues(variant) {
  let url = `${this.baseUri}?target=RESTAPI&_key=${
    this.channelProfile.channelAuthValues.apiKey
  }&_schema=default&_path=attributevalue-attributevalueselect/0`;

  let attributeReqs = {
    uri: url,
    method: "POST",
    resolveWithFullResponse: true
  };

  variant.options.forEach(async option => {
    let attributeValue = {
      variants: [{ id: variant.id }],
      product: {
        product_id: variant.product.product_id
      },
      attribute_option: { id: option.attribute_option_id },
      attribute: { id: option.attribute_id }
    };

    attributeReqs.body = attributeValue;

    this.info(`Requesting [${attributeReqs.method} ${attributeReqs.uri}]`);
    await this.request(attributeReqs)
      .then(response => {
        this.info(`Attribute Value Updated with ID: ${response.body.id}`);
      })
      .catch(this.handleRejection.bind(this));
  });
}

async function removeAttributeValues(aT, aC) {
  this.info("Removing Attribute Values");
  let attributeReqs = {
    method: "DELETE",
    resolveWithFullResponse: true
  };
  for (let i = 0; i < aT.length; i++) {
    attributeReqs.uri = `${this.baseUri}?target=RESTAPI&_key=${
      this.channelProfile.channelAuthValues.apiKey
    }&_schema=default&_path=attributevalue-attributevaluetext/${aT[i].id}`;
    this.info(`Requesting [${attributeReqs.method} ${attributeReqs.uri}]`);
    await this.request(attributeReqs)
      .then(response => {
        this.info(`Attribute with ID ${aT[i].id} removed`);
      })
      .catch(this.handleRejection.bind(this));
  }

  for (let i = 0; i < aC.length; i++) {
    attributeReqs.uri = `${this.baseUri}?target=RESTAPI&_key=${
      this.channelProfile.channelAuthValues.apiKey
    }&_schema=default&_path=attributevalue-attributevaluecheckbox/${aC[i].id}`;
    this.info(`Requesting [${attributeReqs.method} ${attributeReqs.uri}]`);
    await this.request(attributeReqs)
      .then(response => {
        this.info(`Attribute with ID ${aC[i].id} removed`);
      })
      .catch(this.handleRejection.bind(this));
  }
}

async function createAttributeValues(attributeValues) {
  let attributeReqs = {
    method: "POST",
    resolveWithFullResponse: true
  };
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

    attributeReqs.uri = attributeUrl;

    this.info(`Requesting [${attributeReqs.method} ${attributeReqs.uri}]`);
    await this.request(attributeReqs)
      .then(response => {
        this.info(`Attribute of type '${attributeValues[i].type}' Value Inserted with ID: ${response.body.id}`);
      })
      .catch(this.handleRejection.bind(this));
  }
}
