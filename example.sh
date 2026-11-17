curl -L -X POST "https://script.google.com/macros/s/{replace-this}/exec" \
-H "Content-Type: application/json" \
-d '{
  "update_id": 999999999,
  "message": {
    "chat": {
      "id": 12345678
    },
    "from": {
      "id": 12345678,
      "first_name": "someone"
    },
    "text": "/start"
  }
}'