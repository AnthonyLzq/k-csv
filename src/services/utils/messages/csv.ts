enum ErrorForCsv {
  MISSING_CSV = 'Csv was not found, please contact with anthony.luzquinos@gmail.com',
  REDIS_GET = 'There was not any file stored in redis',
  REDIS_SET = 'There was an error trying to store the file in redis'
}

enum MessageForCsv {
  UPLOAD_SUCCESS = 'Csv uploaded successfully at '
}

export { ErrorForCsv as EFC, MessageForCsv as MFC }
