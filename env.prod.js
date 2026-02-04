export const env = {
    aws: {
        REGION: '{REGION}',
        credentials: {
            ACCESS_KEY_ID: '{ACCESS_KEY_ID}',
            SECRET_ACCESS_KEY: '{SECRET_ACCESS_KEY}'
        },
        services: {
            rekognition: {
                COLLECTION_ID: '{COLLECTION_ID}',
                FACE_MATCH_THRESHOLD: 80
            },
            s3: {
                BUCKET_NAME: '{BUCKET_NAME}'
            }
        }
    },
    express: {
        PORT: '~{PORT}'
    },
    analysis: {
        CAPTURE_INTERVAL_SECONDS: 1.5
    },
    auth: {
        PASSWORD: '{PASSWORD}'
    }
}