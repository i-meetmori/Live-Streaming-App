export const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiJlYjkwZTkwZi1jOWFjLTQ0ZmItYTJiZS1iMjMxM2Y5YWYxMDMiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTY5NTYxNDEwMSwiZXhwIjoxNjk2MjE4OTAxfQ.biAJG4-BDu5DI-QxpIdvkYyNQJfAtAgdbyCZSwYCFNg";

export const createMeeting = async ({ token }) => {
  const res = await fetch(`https://api.videosdk.live/v2/rooms`, {
    method: "POST",
    headers: {
      authorization: `${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  //Destructuring the roomId from the response
  const { roomId } = await res.json();
  return roomId;
};