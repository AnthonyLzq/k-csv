import Joi from 'joi'

const csvSchema = Joi.object().keys({
  data    : Joi.binary().required(),
  encoding: Joi.string().required(),
  mimetype: Joi.string().valid('text/csv').required(),
  name    : Joi.string().required(),
  size    : Joi.number()
    .less(500000000)
    .required()
    .messages({
      'number.less': 'Csv file size must be less than 500MB'
    })
})

export { csvSchema }
