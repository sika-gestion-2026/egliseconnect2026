import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Politique de Confidentialité | Eglise Connect',
  description: 'Politique de confidentialité de l\'application Eglise Connect',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm p-8 md:p-12">
        
        <div className="mb-8">
          <Link href="/" className="text-primary-600 hover:text-primary-700 flex items-center gap-2 font-medium">
            <span>←</span> Retour à l'accueil
          </Link>
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-8 font-serif">Politique de Confidentialité</h1>
        
        <div className="prose prose-primary max-w-none text-gray-600 space-y-6">
          <p className="text-sm text-gray-500 italic">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">1. Introduction</h2>
            <p>
              Bienvenue sur <strong>Eglise Connect</strong>. Le respect de votre vie privée et la protection de vos données personnelles 
              sont notre priorité. Cette politique explique quelles informations nous collectons, comment nous les utilisons et 
              quels sont vos droits, conformément aux exigences de Google Play et aux lois sur la protection des données.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">2. Données que nous collectons</h2>
            <p>Pour assurer le bon fonctionnement de l'application au sein de notre communauté, nous collectons :</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><strong>Informations de profil :</strong> Nom, prénom, numéro de téléphone, date de naissance (pour les anniversaires), et photo de profil éventuelle.</li>
              <li><strong>Données d'utilisation :</strong> Historique de présence aux cultes, participation aux réunions, et notes personnelles.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">3. Autorisations de l'appareil (Sensibles)</h2>
            <p>Notre application requiert certaines autorisations spécifiques sur votre appareil :</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><strong>Appareil Photo (Caméra) :</strong> Cette autorisation est requise de manière optionnelle <strong>exclusivement</strong> pour scanner les QR Codes à l'entrée afin de valider votre présence. Aucune photo ou vidéo n'est enregistrée ni transmise à nos serveurs.</li>
              <li><strong>Notifications :</strong> Pour vous rappeler les cultes et événements à venir.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">4. Utilisation des données</h2>
            <p>Vos données sont utilisées strictement dans le cadre des activités de l'église :</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Gestion de votre profil membre et de votre appartenance aux différents départements.</li>
              <li>Communication d'informations importantes (notifications de cultes).</li>
              <li>Organisation interne (suivi pastoral, gestion de la mutuelle).</li>
            </ul>
            <p className="mt-4 font-semibold text-gray-900">
              Nous ne vendons, ne louons et ne partageons en aucun cas vos données personnelles à des tiers à des fins commerciales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">5. Sécurité des données</h2>
            <p>
              Toutes vos informations sont stockées de manière sécurisée (base de données chiffrée) et l'accès est strictement 
              limité aux administrateurs (pasteurs et responsables) ayant besoin d'y accéder pour l'exercice de leurs fonctions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">6. Demande de suppression des données</h2>
            <p>
              Vous avez le droit de consulter, modifier ou demander la suppression totale de vos données à tout moment. 
              Pour demander la suppression de votre compte et de toutes vos informations associées, veuillez contacter 
              l'administrateur de votre église ou nous écrire via l'application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">7. Nous contacter</h2>
            <p>
              Si vous avez des questions concernant cette politique de confidentialité, n'hésitez pas à nous contacter 
              directement auprès de l'administration de l'église.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
