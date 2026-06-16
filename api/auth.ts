export default async (req: any, res: any) => {
  if (req.method === 'GET') {
    return res.status(200).json({
      id: '123',
      email: 'test@hospital.local',
      fullName: 'Test User',
    });
  }

  if (req.method === 'POST') {
    const { email, password } = req.body;
    return res.status(200).json({
      token: 'dummy-jwt-token',
      user: { email, fullName: 'User' },
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};