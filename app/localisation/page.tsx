import MapComponent from '@/components/MapComponent';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Localisation | Eglise Connect',
  description: 'Trouvez facilement votre chemin vers l\'église.',
};

export default async function LocalisationPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Try to get the church from user profile or session
  const { data: { user } } = await supabase.auth.getUser();
  let targetChurchId = null;

  if (user) {
    const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user.id).single();
    if (profile?.church_id) targetChurchId = profile.church_id;
  }

  if (!targetChurchId) {
    const memberSession = cookieStore.get("member_session")?.value;
    if (memberSession) {
      try {
        const decoded = JSON.parse(Buffer.from(memberSession, "base64").toString("utf-8"));
        targetChurchId = decoded.church_id;
      } catch (e) {}
    }
  }

  let churchLocation = { lat: -4.4419, lng: 15.2663 }; // Default Kinshasa
  let churchName = "Eglise (Position par défaut)";

  if (targetChurchId) {
    const { data: church } = await supabase.from('churches').select('name, latitude, longitude').eq('id', targetChurchId).single();
    if (church) {
      churchName = church.name;
      // If latitude and longitude are defined, use them, otherwise use default
      if (church.latitude && church.longitude) {
        churchLocation = { lat: church.latitude, lng: church.longitude };
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Venir à l'Église</h1>
          <p className="text-gray-600 mb-8">
            Utilisez la carte ci-dessous pour trouver l'église. Cliquez sur "M'y rendre" pour calculer l'itinéraire depuis votre position.
          </p>
          
          <MapComponent churchLocation={churchLocation} churchName={churchName} />
        </div>
      </div>
    </div>
  );
}
