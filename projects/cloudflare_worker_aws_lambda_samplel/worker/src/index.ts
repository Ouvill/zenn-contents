import { Hono } from 'hono'
import { AwsClient } from "aws4fetch"
import { HonoType } from './type'

const app = new Hono<HonoType>()
  .get('/', (c) => {
    // const client = newAws4Client(c)
    const client = new AwsClient({
      accessKeyId: c.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: c.env.AWS_SECRET_ACCESS_KEY,
    })

    return client.fetch(c.env.AWS_Lambda_Function_URL)
  });

export default app
