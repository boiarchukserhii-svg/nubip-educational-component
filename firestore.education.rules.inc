    match /nubipEducation/{accountId} {
      function educationOwner() {
        return request.auth != null
          && request.auth.uid == accountId
          && request.auth.token.email_verified == true
          && request.auth.token.email == 'boiarchuk.serhii@gmail.com'
          && request.auth.token.firebase.sign_in_provider == 'google.com';
      }
      function educationRecord(revision) {
        return request.resource.data.keys().hasOnly(['revision', 'content'])
          && request.resource.data.revision is int
          && request.resource.data.revision == revision
          && request.resource.data.content is string
          && request.resource.data.content.size() <= 850000;
      }
      allow get: if educationOwner();
      allow create: if educationOwner() && educationRecord(1);
      allow update: if educationOwner() && educationRecord(resource.data.revision + 1);
    }
